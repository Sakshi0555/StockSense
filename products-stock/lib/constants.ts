export const OP_TYPES = ["RECEIPT", "DELIVERY", "INTERNAL", "ADJUSTMENT"] as const;
export const OP_STATUSES = ["DRAFT", "WAITING", "READY", "DONE", "CANCELED"] as const;

export const TYPE_LABELS: Record<string, string> = {
  RECEIPT: "Receipt",
  DELIVERY: "Delivery",
  INTERNAL: "Internal Transfer",
  ADJUSTMENT: "Adjustment",
};

export const TYPE_ROUTES: Record<string, string> = {
  RECEIPT: "/operations/receipts",
  DELIVERY: "/operations/deliveries",
  INTERNAL: "/operations/transfers",
  ADJUSTMENT: "/operations/adjustments",
};

// Receipts & transfers skip WAITING; deliveries wait when stock is short.
export const STATUS_FLOW: Record<string, string[]> = {
  RECEIPT: ["DRAFT", "READY", "DONE"],
  DELIVERY: ["DRAFT", "WAITING", "READY", "DONE"],
  INTERNAL: ["DRAFT", "READY", "DONE"],
  ADJUSTMENT: ["DONE"],
};

export function formatQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function isLate(op: { scheduledDate: Date; status: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !["DONE", "CANCELED"].includes(op.status) && new Date(op.scheduledDate) < today;
}
