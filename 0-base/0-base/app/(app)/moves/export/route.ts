import type { NextRequest } from "next/server";
import { TYPE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { locLabel } from "@/lib/labels";
import { moveDirection, moveWhere } from "@/lib/moves";
import { getCurrentUser } from "@/lib/session";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// GET /moves/export?from=&to=&type=&product=&q= → the filtered stock ledger as CSV.
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const moves = await prisma.stockMove.findMany({
    where: moveWhere(params),
    include: { product: true, fromLocation: { include: { warehouse: true } }, toLocation: { include: { warehouse: true } } },
    orderBy: { date: "desc" },
  });

  const header = ["Date", "Reference", "Type", "Direction", "SKU", "Product", "From", "To", "Contact", "Quantity", "UoM"];
  const rows = moves.map((m) => {
    const dir = moveDirection(m);
    return [
      m.date.toISOString().slice(0, 16).replace("T", " "),
      m.reference,
      TYPE_LABELS[m.type] ?? m.type,
      dir,
      m.product.sku,
      m.product.name,
      m.fromLocation ? locLabel(m.fromLocation) : (m.fromLabel ?? ""),
      m.toLocation ? locLabel(m.toLocation) : (m.toLabel ?? ""),
      m.contact ?? "",
      dir === "out" ? -m.quantity : m.quantity,
      m.product.uom,
    ];
  });

  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stocksense-move-history-${date}.csv"`,
    },
  });
}
