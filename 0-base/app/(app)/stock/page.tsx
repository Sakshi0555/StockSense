import { Alert, Input, PageHeader, Select, Table, Td, btn, btnPrimary } from "@/components/ui";
import { formatQty } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { locLabel } from "@/lib/labels";
import { adjustStock } from "../operations/adjustments/actions";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; warehouse?: string; error?: string; success?: string }>;
}) {
  const { q = "", warehouse = "", error, success } = await searchParams;
  const term = q.trim();

  const [quants, warehouses, reservedRows] = await Promise.all([
    prisma.stockQuant.findMany({
      where: {
        location: warehouse ? { warehouseId: Number(warehouse) } : undefined,
        product: term ? { OR: [{ name: { contains: term } }, { sku: { contains: term } }] } : undefined,
      },
      include: { product: true, location: { include: { warehouse: true } } },
      orderBy: [{ product: { name: "asc" } }],
    }),
    prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
    // Reserved stock is tracked per source location.
    prisma.operationLine.findMany({
      where: { operation: { status: "READY", type: { in: ["DELIVERY", "INTERNAL"] } } },
      select: { productId: true, quantity: true, operation: { select: { sourceLocationId: true } } },
    }),
  ]);
  const reservedAt = new Map<string, number>();
  for (const r of reservedRows) {
    const key = `${r.productId}:${r.operation.sourceLocationId}`;
    reservedAt.set(key, (reservedAt.get(key) ?? 0) + r.quantity);
  }

  const back = `/stock?${new URLSearchParams({ q, warehouse })}`;

  return (
    <div className="max-w-6xl">
      <PageHeader title="Stock">
        <form className="flex gap-2">
          <Input name="q" defaultValue={q} placeholder="Search product or SKU…" className="w-56" />
          <Select name="warehouse" defaultValue={warehouse} className="w-44">
            <option value="">All warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <button className={btn}>Filter</button>
        </form>
        <a href="/stock/export" className={btnPrimary} download>
          ⬇ Export CSV
        </a>
      </PageHeader>
      <Alert message={error} />
      <Alert message={success} tone="success" />

      <Table head={["Product", "Location", "Unit cost", "On hand", "Free to use", "Value", "Update count"]} empty={quants.length === 0}>
        {quants.map((sq) => {
          const free = sq.quantity - (reservedAt.get(`${sq.productId}:${sq.locationId}`) ?? 0);
          const low = sq.quantity <= sq.product.reorderMin;
          return (
            <tr key={sq.id} className="hover:bg-zinc-900">
              <Td>
                <div>{sq.product.name}</div>
                <div className="font-mono text-xs text-zinc-500">{sq.product.sku}</div>
              </Td>
              <Td className="font-mono">{locLabel(sq.location)}</Td>
              <Td>₹{sq.product.cost.toLocaleString("en-IN")}</Td>
              <Td className={sq.quantity <= 0 ? "text-red-400" : low ? "text-amber-400" : ""}>
                {formatQty(sq.quantity)} {sq.product.uom}
              </Td>
              <Td>{formatQty(free)}</Td>
              <Td className="text-zinc-400">₹{(sq.quantity * sq.product.cost).toLocaleString("en-IN")}</Td>
              <Td>
                <form action={adjustStock} className="flex gap-1">
                  <input type="hidden" name="productId" value={sq.productId} />
                  <input type="hidden" name="locationId" value={sq.locationId} />
                  <input type="hidden" name="back" value={back} />
                  <Input name="countedQty" type="number" min="0" step="any" defaultValue={sq.quantity} className="w-20 py-1" />
                  <button className="rounded border border-zinc-700 px-2 text-xs hover:border-rose-400">Set</button>
                </form>
              </Td>
            </tr>
          );
        })}
      </Table>
      <p className="mt-3 text-xs text-zinc-500">
        &quot;Free to use&quot; excludes quantities reserved by deliveries and transfers that are Ready. Updating a count creates an
        adjustment in the stock ledger.
      </p>
    </div>
  );
}
