import type { Prisma } from "@prisma/client";

export const TYPE_CODES: Record<string, string> = {
  RECEIPT: "IN",
  DELIVERY: "OUT",
  INTERNAL: "INT",
  ADJUSTMENT: "ADJ",
};

// Next reference in the form <Warehouse>/<Operation>/<ID>, e.g. WH/IN/0001.
// Must run inside a transaction so two users never get the same number.
export async function nextReference(tx: Prisma.TransactionClient, warehouseCode: string, type: string) {
  const key = `${warehouseCode}/${TYPE_CODES[type] ?? type}`;
  const seq = await tx.sequence.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${key}/${String(seq.value).padStart(4, "0")}`;
}
