"use server";

import { revalidatePath } from "next/cache";
import { TYPE_ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { nextReference } from "@/lib/reference";
import { errorMessage, redirectWith } from "@/lib/redirect";
import { operationPermission, requirePermission } from "@/lib/session";
import { cancelOperation, confirmOperation, validateOperation } from "@/lib/stock";

const opPath = (id: number) => `/operations/${id}`;

// Loads the operation and checks the current user may change this type of operation.
async function authorizeOperation(id: number) {
  const op = await prisma.operation.findUniqueOrThrow({ where: { id } });
  await requirePermission(operationPermission(op.type), opPath(id));
  return op;
}

function readHeader(formData: FormData) {
  const date = String(formData.get("scheduledDate") ?? "");
  return {
    contact: String(formData.get("contact") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    scheduledDate: date ? new Date(date) : new Date(),
    sourceLocationId: Number(formData.get("sourceLocationId")) || null,
    destLocationId: Number(formData.get("destLocationId")) || null,
  };
}

function checkLocations(type: string, h: ReturnType<typeof readHeader>): string | null {
  if (type === "RECEIPT" && !h.destLocationId) return "Choose the destination location.";
  if (type === "DELIVERY" && !h.sourceLocationId) return "Choose the source location.";
  if (type === "INTERNAL") {
    if (!h.sourceLocationId || !h.destLocationId) return "Choose both source and destination locations.";
    if (h.sourceLocationId === h.destLocationId) return "Source and destination must be different.";
  }
  return null;
}

export async function createOperation(formData: FormData) {
  const type = String(formData.get("type"));
  if (!["RECEIPT", "DELIVERY", "INTERNAL"].includes(type)) redirectWith("/dashboard", { error: "Unknown operation type." });
  const user = await requirePermission(operationPermission(type), TYPE_ROUTES[type]);

  const header = readHeader(formData);
  const problem = checkLocations(type, header);
  if (problem) redirectWith(`/operations/new?type=${type}`, { error: problem });

  // The reference uses the warehouse the stock belongs to (e.g. WH/IN/0001).
  const refLocationId = type === "RECEIPT" ? header.destLocationId! : header.sourceLocationId!;
  const op = await prisma.$transaction(async (tx) => {
    const loc = await tx.location.findUniqueOrThrow({ where: { id: refLocationId }, include: { warehouse: true } });
    const reference = await nextReference(tx, loc.warehouse.shortCode, type);
    return tx.operation.create({
      data: {
        ...header,
        type,
        reference,
        responsibleId: user.id,
        sourceLocationId: type === "RECEIPT" ? null : header.sourceLocationId,
        destLocationId: type === "DELIVERY" ? null : header.destLocationId,
      },
    });
  });
  revalidatePath(TYPE_ROUTES[type]);
  redirectWith(opPath(op.id), { success: `${op.reference} created. Add products below.` });
}

export async function updateOperationHeader(formData: FormData) {
  const id = Number(formData.get("id"));
  const op = await authorizeOperation(id);
  if (op.status !== "DRAFT") redirectWith(opPath(id), { error: "Only draft operations can be edited." });

  const header = readHeader(formData);
  // Location changes would invalidate the reference prefix, so keep them fixed.
  await prisma.operation.update({
    where: { id },
    data: { contact: header.contact, address: header.address, scheduledDate: header.scheduledDate },
  });
  redirectWith(opPath(id), { success: "Saved." });
}

export async function addLine(formData: FormData) {
  const operationId = Number(formData.get("operationId"));
  const productId = Number(formData.get("productId"));
  const quantity = Number(formData.get("quantity"));
  const op = await authorizeOperation(operationId);
  if (!productId || !(quantity > 0)) redirectWith(opPath(operationId), { error: "Choose a product and a quantity above 0." });
  if (!["DRAFT", "WAITING"].includes(op.status)) redirectWith(opPath(operationId), { error: "Products can only be changed before the operation is ready." });

  await prisma.operationLine.create({ data: { operationId, productId, quantity } });
  revalidatePath(opPath(operationId));
  redirectWith(opPath(operationId), {});
}

// Barcode scanners type the SKU and press Enter, so this is also the "scan" handler.
// Scanning the same product again increases the quantity instead of adding a new line.
export async function addLineBySku(formData: FormData) {
  const operationId = Number(formData.get("operationId"));
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
  const quantity = Number(formData.get("quantity")) || 1;
  const op = await authorizeOperation(operationId);
  if (!["DRAFT", "WAITING"].includes(op.status)) redirectWith(opPath(operationId), { error: "Products can only be changed before the operation is ready." });
  if (!sku) redirectWith(opPath(operationId), { error: "Scan a barcode or type a SKU." });
  if (!(quantity > 0)) redirectWith(opPath(operationId), { error: "Quantity must be above 0." });

  const product = await prisma.product.findUnique({ where: { sku } });
  if (!product) redirectWith(opPath(operationId), { error: `No product found with SKU "${sku}".` });

  const existing = await prisma.operationLine.findFirst({ where: { operationId, productId: product.id } });
  if (existing) {
    await prisma.operationLine.update({ where: { id: existing.id }, data: { quantity: { increment: quantity } } });
  } else {
    await prisma.operationLine.create({ data: { operationId, productId: product.id, quantity } });
  }
  revalidatePath(opPath(operationId));
  redirectWith(opPath(operationId), { success: `Scanned: +${quantity} ${product.uom} ${product.name}` });
}

export async function removeLine(formData: FormData) {
  const id = Number(formData.get("lineId"));
  const line = await prisma.operationLine.findUniqueOrThrow({ where: { id }, include: { operation: true } });
  await authorizeOperation(line.operationId);
  if (!["DRAFT", "WAITING"].includes(line.operation.status)) {
    redirectWith(opPath(line.operationId), { error: "Products can only be changed before the operation is ready." });
  }
  await prisma.operationLine.delete({ where: { id } });
  revalidatePath(opPath(line.operationId));
  redirectWith(opPath(line.operationId), {});
}

async function runStep(id: number, step: (id: number) => Promise<{ status: string }>, done: (status: string) => string) {
  await authorizeOperation(id);
  let status = "";
  try {
    status = (await step(id)).status;
  } catch (e) {
    redirectWith(opPath(id), { error: errorMessage(e) });
  }
  revalidatePath("/", "layout");
  redirectWith(opPath(id), status === "WAITING" ? { error: done(status) } : { success: done(status) });
}

export async function confirmAction(formData: FormData) {
  await runStep(Number(formData.get("id")), confirmOperation, (s) =>
    s === "WAITING" ? "Some products are out of stock. The delivery is waiting for stock." : "Marked as Ready.",
  );
}

export async function validateAction(formData: FormData) {
  await runStep(Number(formData.get("id")), validateOperation, () => "Validated. Stock has been updated.");
}

export async function cancelAction(formData: FormData) {
  await runStep(Number(formData.get("id")), cancelOperation, () => "Operation canceled.");
}
