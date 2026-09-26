import Link from "next/link";
import { Input, PageHeader, Select, Table, Td, btn, btnPrimary } from "@/components/ui";
import { OP_TYPES, TYPE_LABELS, formatDate, formatQty } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { locLabel } from "@/lib/labels";
import { type MoveFilters, moveDirection, moveWhere } from "@/lib/moves";

// Stock ledger: one row per product moved. Incoming in green, outgoing in red.
export default async function MoveHistoryPage({
  searchParams,
}: {
  searchParams: Promise<MoveFilters & { view?: string }>;
}) {
  const { view = "list", ...filters } = await searchParams;
  const { q = "", type = "", product = "", from = "", to = "" } = filters;

  const [moves, products] = await Promise.all([
    prisma.stockMove.findMany({
      where: moveWhere(filters),
      include: {
        product: true,
        fromLocation: { include: { warehouse: true } },
        toLocation: { include: { warehouse: true } },
      },
      orderBy: { date: "desc" },
      take: 500,
    }),
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const direction = moveDirection;
  const color = { in: "text-emerald-400", out: "text-red-400", internal: "text-sky-300" };
  const filterQs = new URLSearchParams({ q, type, product, from, to });
  const qs = (v: string) => `?${new URLSearchParams({ q, type, product, from, to, view: v })}`;
  const totalIn = moves.filter((m) => direction(m) === "in").reduce((s, m) => s + m.quantity, 0);
  const totalOut = moves.filter((m) => direction(m) === "out").reduce((s, m) => s + m.quantity, 0);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Move History">
        <a href={`/moves/export?${filterQs}`} className={btnPrimary} download>
          ⬇ Export CSV
        </a>
        <div className="flex overflow-hidden rounded-md border border-zinc-700 text-sm">
          <Link href={qs("list")} className={`px-3 py-1.5 ${view === "list" ? "bg-rose-500/20 text-rose-300" : "text-zinc-400"}`}>
            List
          </Link>
          <Link href={qs("kanban")} className={`px-3 py-1.5 ${view === "kanban" ? "bg-rose-500/20 text-rose-300" : "text-zinc-400"}`}>
            Kanban
          </Link>
        </div>
      </PageHeader>

      <form className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        <input type="hidden" name="view" value={view} />
        <Input name="q" defaultValue={q} placeholder="Reference, contact, product…" className="w-56" />
        <Select name="type" defaultValue={type} className="w-40">
          <option value="">All types</option>
          {OP_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select name="product" defaultValue={product} className="w-44">
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <label className="text-xs text-zinc-400">
          From
          <Input name="from" type="date" defaultValue={from} className="w-40" />
        </label>
        <label className="text-xs text-zinc-400">
          To
          <Input name="to" type="date" defaultValue={to} className="w-40" />
        </label>
        <button className={btn}>Apply</button>
        <Link href="/moves" className="self-center text-xs text-zinc-500 hover:text-rose-300">
          Reset
        </Link>
      </form>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-md bg-zinc-900 px-3 py-1.5">{moves.length} moves</span>
        <span className="rounded-md bg-emerald-500/10 px-3 py-1.5 text-emerald-300">+{formatQty(totalIn)} in</span>
        <span className="rounded-md bg-red-500/10 px-3 py-1.5 text-red-300">−{formatQty(totalOut)} out</span>
      </div>

      {view === "kanban" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {OP_TYPES.map((t) => {
            const col = moves.filter((m) => m.type === t);
            return (
              <div key={t} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="mb-3 flex justify-between text-sm font-medium text-rose-300">
                  {TYPE_LABELS[t]} <span className="text-xs text-zinc-500">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((m) => (
                    <div key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs">
                      <div className="font-mono text-sm text-rose-300">{m.reference}</div>
                      <div className="mt-1">{m.product.name}</div>
                      <div className={`mt-1 ${color[direction(m)]}`}>
                        {direction(m) === "out" ? "−" : "+"}
                        {formatQty(m.quantity)} {m.product.uom}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Table head={["Reference", "Date", "Product", "Contact", "From", "To", "Quantity"]} empty={moves.length === 0}>
          {moves.map((m) => {
            const dir = direction(m);
            return (
              <tr key={m.id} className={color[dir]}>
                <Td className="font-mono">
                  {m.operationId ? (
                    <Link href={`/operations/${m.operationId}`} className="hover:underline">
                      {m.reference}
                    </Link>
                  ) : (
                    m.reference
                  )}
                </Td>
                <Td>{formatDate(m.date)}</Td>
                <Td>{m.product.name}</Td>
                <Td>{m.contact || "—"}</Td>
                <Td className="font-mono">{m.fromLocation ? locLabel(m.fromLocation) : m.fromLabel}</Td>
                <Td className="font-mono">{m.toLocation ? locLabel(m.toLocation) : m.toLabel}</Td>
                <Td className="font-medium">
                  {dir === "out" ? "−" : dir === "in" ? "+" : ""}
                  {formatQty(m.quantity)} {m.product.uom}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
      <p className="mt-3 text-xs text-zinc-500">
        <span className="text-emerald-400">Green</span> = stock coming in · <span className="text-red-400">Red</span> = stock going out ·{" "}
        <span className="text-sky-300">Blue</span> = internal move
      </p>
    </div>
  );
}
