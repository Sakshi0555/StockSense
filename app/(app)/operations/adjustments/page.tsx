import { Alert, Card, Field, Input, PageHeader, Select, Table, Td, btnPrimary } from "@/components/ui";
import { formatDate, formatQty } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { locLabel } from "@/lib/labels";
import { adjustStock } from "./actions";

export default async function AdjustmentsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { error, success } = await searchParams;
  const [adjustments, products, locations] = await Promise.all([
    prisma.operation.findMany({
      where: { type: "ADJUSTMENT" },
      include: { lines: { include: { product: true } }, sourceLocation: { include: { warehouse: true } }, responsible: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ include: { warehouse: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Inventory Adjustments" />
      <p className="-mt-3 mb-6 text-sm text-zinc-400">Fix mismatches between recorded stock and the physical count.</p>
      <Alert message={error} />
      <Alert message={success} tone="success" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Table head={["Reference", "Date", "Product", "Location", "Change", "Reason", "By"]} empty={adjustments.length === 0}>
          {adjustments.map((a) =>
            a.lines.map((l) => (
              <tr key={l.id}>
                <Td className="font-mono text-rose-300">{a.reference}</Td>
                <Td>{formatDate(a.createdAt)}</Td>
                <Td>{l.product.name}</Td>
                <Td className="font-mono">{locLabel(a.sourceLocation)}</Td>
                <Td className={l.quantity >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {l.quantity >= 0 ? "+" : ""}
                  {formatQty(l.quantity)}
                </Td>
                <Td className="text-zinc-400">{a.contact || "—"}</Td>
                <Td className="text-zinc-400">{a.responsible?.loginId}</Td>
              </tr>
            )),
          )}
        </Table>

        <Card>
          <form action={adjustStock} className="space-y-4">
            <h2 className="font-semibold">New count</h2>
            <Field label="Product">
              <Select name="productId" required>
                <option value="">— Select —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Location">
              <Select name="locationId" required>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {locLabel(l)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Counted quantity">
              <Input name="countedQty" type="number" min="0" step="any" required />
            </Field>
            <Field label="Reason">
              <Input name="reason" placeholder="Damaged, cycle count…" />
            </Field>
            <button className={`${btnPrimary} w-full`}>Apply adjustment</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
