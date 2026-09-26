import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { nextReference } from "./reference";

type Tx = Prisma.TransactionClient;

export class StockError extends Error {}

async function changeQuant(tx: Tx, productId: number, locationId: number, delta: number) {
  await tx.stockQuant.upsert({
    where: { productId_locationId: { productId, locationId } },
    create: { productId, locationId, quantity: delta },
    update: { quantity: { increment: delta } },
  });
}

async function onHandAt(tx: Tx, productId: number, locationId: number) {
  const q = await tx.stockQuant.findUnique({ where: { productId_locationId: { productId, locationId } } });
  return q?.quantity ?? 0;
}

// Quantity already promised to other READY outgoing operations from this location.
async function reservedAt(tx: Tx, productId: number, locationId: number, excludeOpId?: number) {
  const agg = await tx.operationLine.aggregate({
    _sum: { quantity: true },
    where: {
      productId,
      operation: {
        status: "READY",
        sourceLocationId: locationId,
        type: { in: ["DELIVERY", "INTERNAL"] },
        id: excludeOpId ? { not: excludeOpId } : undefined,
      },
    },
  });
  return agg._sum.quantity ?? 0;
}

function sumByProduct(lines: { productId: number; quantity: number }[]) {
  const totals = new Map<number, number>();
  for (const l of lines) totals.set(l.productId, (totals.get(l.productId) ?? 0) + l.quantity);
  return totals;
}

// Product ids whose requested quantity exceeds what is free at the source location.
export async function findShortages(
  tx: Tx,
  opId: number,
  sourceLocationId: number,
  lines: { productId: number; quantity: number }[],
) {
  const short: number[] = [];
  for (const [productId, qty] of sumByProduct(lines)) {
    const free = (await onHandAt(tx, productId, sourceLocationId)) - (await reservedAt(tx, productId, sourceLocationId, opId));
    if (qty > free) short.push(productId);
  }
  return short;
}

async function loadOp(tx: Tx, id: number) {
  const op = await tx.operation.findUnique({ where: { id }, include: { lines: true } });
  if (!op) throw new StockError("Operation not found.");
  return op;
}

// "To Do": DRAFT → READY, or → WAITING for outgoing ops when stock is short.
// Calling it again on a WAITING op re-checks availability.
export async function confirmOperation(id: number) {
  return prisma.$transaction(async (tx) => {
    const op = await loadOp(tx, id);
    if (!["DRAFT", "WAITING"].includes(op.status)) throw new StockError(`Cannot confirm an operation in ${op.status}.`);
    if (op.lines.length === 0) throw new StockError("Add at least one product first.");

    let status = "READY";
    if (op.type === "DELIVERY" || op.type === "INTERNAL") {
      if (!op.sourceLocationId) throw new StockError("Source location is required.");
      const short = await findShortages(tx, op.id, op.sourceLocationId, op.lines);
      if (short.length > 0) {
        if (op.type === "INTERNAL") throw new StockError("Not enough stock at the source location.");
        status = "WAITING";
      }
    }
    return tx.operation.update({ where: { id }, data: { status } });
  });
}

// "Validate": READY → DONE. Updates stock quantities and writes the ledger.
export async function validateOperation(id: number) {
  return prisma.$transaction(async (tx) => {
    const op = await loadOp(tx, id);
    if (op.status !== "READY") throw new StockError("Only operations in READY can be validated.");

    if (op.type === "DELIVERY" || op.type === "INTERNAL") {
      const short = await findShortages(tx, op.id, op.sourceLocationId!, op.lines);
      if (short.length > 0) throw new StockError("Not enough stock to validate this operation.");
    }

    for (const line of op.lines) {
      if (op.type === "RECEIPT") {
        await changeQuant(tx, line.productId, op.destLocationId!, line.quantity);
      } else if (op.type === "DELIVERY") {
        await changeQuant(tx, line.productId, op.sourceLocationId!, -line.quantity);
      } else if (op.type === "INTERNAL") {
        await changeQuant(tx, line.productId, op.sourceLocationId!, -line.quantity);
        await changeQuant(tx, line.productId, op.destLocationId!, line.quantity);
      }
      await tx.stockMove.create({
        data: {
          reference: op.reference,
          type: op.type,
          operationId: op.id,
          productId: line.productId,
          fromLocationId: op.type === "RECEIPT" ? null : op.sourceLocationId,
          toLocationId: op.type === "DELIVERY" ? null : op.destLocationId,
          fromLabel: op.type === "RECEIPT" ? op.contact || "Vendor" : null,
          toLabel: op.type === "DELIVERY" ? op.contact || "Customer" : null,
          contact: op.contact,
          quantity: line.quantity,
        },
      });
    }
    return tx.operation.update({ where: { id }, data: { status: "DONE", doneAt: new Date() } });
  });
}

export async function cancelOperation(id: number) {
  const op = await prisma.operation.findUnique({ where: { id } });
  if (!op) throw new StockError("Operation not found.");
  if (op.status === "DONE") throw new StockError("A done operation cannot be canceled.");
  return prisma.operation.update({ where: { id }, data: { status: "CANCELED" } });
}

// Stock adjustment: set the counted quantity and log the difference.
export async function applyAdjustment(opts: {
  productId: number;
  locationId: number;
  countedQty: number;
  userId: number;
  reason?: string;
}) {
  if (opts.countedQty < 0) throw new StockError("Counted quantity cannot be negative.");
  return prisma.$transaction(async (tx) => {
    const location = await tx.location.findUnique({ where: { id: opts.locationId }, include: { warehouse: true } });
    if (!location) throw new StockError("Location not found.");

    const current = await onHandAt(tx, opts.productId, opts.locationId);
    const diff = opts.countedQty - current;
    if (diff === 0) throw new StockError("Counted quantity matches recorded stock. Nothing to adjust.");

    const reference = await nextReference(tx, location.warehouse.shortCode, "ADJUSTMENT");
    const op = await tx.operation.create({
      data: {
        reference,
        type: "ADJUSTMENT",
        status: "DONE",
        contact: opts.reason || null,
        sourceLocationId: opts.locationId,
        destLocationId: opts.locationId,
        responsibleId: opts.userId,
        doneAt: new Date(),
        lines: { create: { productId: opts.productId, quantity: diff } },
      },
    });
    await changeQuant(tx, opts.productId, opts.locationId, diff);
    await tx.stockMove.create({
      data: {
        reference,
        type: "ADJUSTMENT",
        operationId: op.id,
        productId: opts.productId,
        fromLocationId: diff < 0 ? opts.locationId : null,
        toLocationId: diff > 0 ? opts.locationId : null,
        fromLabel: diff > 0 ? "Inventory adjustment" : null,
        toLabel: diff < 0 ? "Inventory adjustment" : null,
        contact: opts.reason || null,
        quantity: Math.abs(diff),
      },
    });
    return op;
  });
}

// Per-product totals used by the stock page and dashboard.
export async function productStockSummary() {
  const [products, reserved] = await Promise.all([
    prisma.product.findMany({ include: { category: true, quants: { include: { location: true } } }, orderBy: { name: "asc" } }),
    prisma.operationLine.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: { operation: { status: "READY", type: "DELIVERY" } },
    }),
  ]);
  const reservedMap = new Map(reserved.map((r) => [r.productId, r._sum.quantity ?? 0]));
  return products.map((p) => {
    const onHand = p.quants.reduce((s, q) => s + q.quantity, 0);
    const reservedQty = reservedMap.get(p.id) ?? 0;
    return {
      ...p,
      onHand,
      reserved: reservedQty,
      free: onHand - reservedQty,
      isOut: onHand <= 0,
      isLow: onHand > 0 && onHand <= p.reorderMin,
    };
  });
}
