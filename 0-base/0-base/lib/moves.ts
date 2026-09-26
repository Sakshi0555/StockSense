import type { Prisma } from "@prisma/client";

export type MoveFilters = { q?: string; type?: string; product?: string; from?: string; to?: string };

// Shared by the Move History page and its CSV export so both show the same rows.
export function moveWhere({ q = "", type = "", product = "", from = "", to = "" }: MoveFilters): Prisma.StockMoveWhereInput {
  const term = q.trim();
  const date: Prisma.DateTimeFilter = {};
  if (from) date.gte = new Date(`${from}T00:00:00`);
  if (to) {
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1); // include the whole "to" day
    date.lt = end;
  }
  return {
    type: type || undefined,
    productId: product ? Number(product) : undefined,
    date: from || to ? date : undefined,
    OR: term
      ? [{ reference: { contains: term } }, { contact: { contains: term } }, { product: { name: { contains: term } } }]
      : undefined,
  };
}

export function moveDirection(m: { fromLocationId: number | null; toLocationId: number | null }) {
  return !m.fromLocationId ? "in" : !m.toLocationId ? "out" : "internal";
}
