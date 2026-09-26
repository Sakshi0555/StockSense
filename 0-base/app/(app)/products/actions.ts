"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { errorMessage, redirectWith } from "@/lib/redirect";
import { nextReference } from "@/lib/reference";
import { requirePermission } from "@/lib/session";
import { applyAdjustment, productStockSummary } from "@/lib/stock";

function readProduct(formData: FormData) {
  const categoryId = Number(formData.get("categoryId")) || null;
  return {
    name: String(formData.get("name") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim().toUpperCase(),
    uom: String(formData.get("uom") ?? "Units").trim() || "Units",
    cost: Number(formData.get("cost")) || 0,
    reorderMin: Math.max(0, Number(formData.get("reorderMin")) || 0),
    reorderQty: Math.max(0, Number(formData.get("reorderQty")) || 0),
    categoryId,
  };
}

export async function createProduct(formData: FormData) {
  const user = await requirePermission("manageProducts", "/products");
  const data = readProduct(formData);
  const initialQty = Number(formData.get("initialQty")) || 0;
  const locationId = Number(formData.get("locationId")) || 0;
  if (!data.name || !data.sku) redirectWith("/products/new", { error: "Name and SKU are required." });
  if (initialQty > 0 && !locationId) redirectWith("/products/new", { error: "Choose a location for the initial stock." });

  let productId = 0;
  try {
    productId = (await prisma.product.create({ data })).id;
    // Initial stock goes through an adjustment so it appears in the ledger.
    if (initialQty > 0) {
      await applyAdjustment({ productId, locationId, countedQty: initialQty, userId: user.id, reason: "Initial stock" });
    }
  } catch (e) {
    redirectWith("/products/new", { error: errorMessage(e) });
  }
  revalidatePath("/products");
  redirectWith(`/products/${productId}`, { success: "Product created." });
}

export async function updateProduct(formData: FormData) {
  await requirePermission("manageProducts", "/products");
  const id = Number(formData.get("id"));
  const data = readProduct(formData);
  if (!data.name || !data.sku) redirectWith(`/products/${id}`, { error: "Name and SKU are required." });
  try {
    await prisma.product.update({ where: { id }, data });
  } catch (e) {
    redirectWith(`/products/${id}`, { error: errorMessage(e) });
  }
  revalidatePath("/products");
  redirectWith(`/products/${id}`, { success: "Product updated." });
}

export async function createCategory(formData: FormData) {
  await requirePermission("manageProducts", "/products");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirectWith("/products/categories", { error: "Category name is required." });
  try {
    await prisma.category.create({ data: { name } });
  } catch (e) {
    redirectWith("/products/categories", { error: errorMessage(e) });
  }
  revalidatePath("/products/categories");
  redirectWith("/products/categories", { success: `Category "${name}" created.` });
}

// Products at or below their low-stock threshold that have a reorder quantity
// and are not already on an open receipt.
async function reorderCandidates() {
  const [summary, onOrder] = await Promise.all([
    productStockSummary(),
    prisma.operationLine.findMany({
      where: { operation: { type: "RECEIPT", status: { in: ["DRAFT", "WAITING", "READY"] } } },
      select: { productId: true },
    }),
  ]);
  const onOrderIds = new Set(onOrder.map((l) => l.productId));
  return summary.filter((p) => (p.isLow || p.isOut) && p.reorderQty > 0 && !onOrderIds.has(p.id));
}

// One click: create a draft receipt that restocks every low-stock product by its reorder quantity.
export async function autoReorder() {
  const user = await requirePermission("manageReceiptsDeliveries", "/products");
  const toOrder = await reorderCandidates();
  if (toOrder.length === 0) {
    redirectWith("/products", { error: "Nothing to reorder: low-stock products are already on an open receipt or have no reorder quantity." });
  }
  const dest =
    (await prisma.location.findFirst({ where: { shortCode: "Stock" }, include: { warehouse: true }, orderBy: { id: "asc" } })) ??
    (await prisma.location.findFirst({ include: { warehouse: true }, orderBy: { id: "asc" } }));
  if (!dest) redirectWith("/products", { error: "Create a warehouse first." });

  const op = await prisma.$transaction(async (tx) => {
    const reference = await nextReference(tx, dest.warehouse.shortCode, "RECEIPT");
    return tx.operation.create({
      data: {
        reference,
        type: "RECEIPT",
        contact: "Auto-reorder",
        destLocationId: dest.id,
        responsibleId: user.id,
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        lines: { create: toOrder.map((p) => ({ productId: p.id, quantity: p.reorderQty })) },
      },
    });
  });
  revalidatePath("/", "layout");
  redirectWith(`/operations/${op.id}`, {
    success: `Auto-reorder created ${op.reference} for ${toOrder.length} low-stock product(s). Review it, then Mark as To Do.`,
  });
}
