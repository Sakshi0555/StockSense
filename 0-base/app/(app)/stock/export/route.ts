import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// GET /stock/export → stock per location as a CSV file (opens in Excel / Google Sheets).
export async function GET() {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const quants = await prisma.stockQuant.findMany({
    include: { product: { include: { category: true } }, location: { include: { warehouse: true } } },
    orderBy: [{ product: { name: "asc" } }],
  });

  const header = ["SKU", "Product", "Category", "Warehouse", "Location", "On hand", "UoM", "Unit cost (INR)", "Value (INR)", "Low stock"];
  const rows = quants.map((q) => [
    q.product.sku,
    q.product.name,
    q.product.category?.name ?? "",
    q.location.warehouse.name,
    `${q.location.warehouse.shortCode}/${q.location.shortCode}`,
    q.quantity,
    q.product.uom,
    q.product.cost,
    q.quantity * q.product.cost,
    q.quantity <= q.product.reorderMin ? "Yes" : "No",
  ]);

  // Leading BOM so Excel reads ₹ and other UTF-8 characters correctly.
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stocksense-stock-${date}.csv"`,
    },
  });
}
