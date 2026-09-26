type Loc = { shortCode: string; warehouse: { shortCode: string } } | null | undefined;

export function locLabel(loc: Loc) {
  return loc ? `${loc.warehouse.shortCode}/${loc.shortCode}` : "";
}

type OpForLabels = {
  type: string;
  contact: string | null;
  sourceLocation?: Loc;
  destLocation?: Loc;
};

export function opFrom(op: OpForLabels) {
  return op.type === "RECEIPT" ? op.contact || "Vendor" : locLabel(op.sourceLocation);
}

export function opTo(op: OpForLabels) {
  return op.type === "DELIVERY" ? op.contact || "Customer" : locLabel(op.destLocation);
}
