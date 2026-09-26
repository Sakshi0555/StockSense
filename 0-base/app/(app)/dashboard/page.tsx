import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Alert, Card, PageHeader, Select, StatusBadge, Table, Td, btn } from "@/components/ui";
import { OP_STATUSES, OP_TYPES, TYPE_LABELS, formatDate, formatQty, isLate } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { opFrom, opTo } from "@/lib/labels";
import { productStockSummary } from "@/lib/stock";
import { CategoryValueChart, InOutChart, type DayFlow } from "./Charts";

type Filters = { type?: string; status?: string; warehouse?: string; category?: string; error?: string };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { type = "", status = "", warehouse = "", category = "", error } = await searchParams;

  const open = { status: { in: ["DRAFT", "WAITING", "READY"] } };
  const where: Prisma.OperationWhereInput = {
    type: type || undefined,
    status: status || undefined,
    ...(warehouse && {
      OR: [
        { sourceLocation: { warehouseId: Number(warehouse) } },
        { destLocation: { warehouseId: Number(warehouse) } },
      ],
    }),
    ...(category && { lines: { some: { product: { categoryId: Number(category) } } } }),
  };

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const [stock, openOps, filtered, warehouses, categories, weekMoves] = await Promise.all([
    productStockSummary(),
    prisma.operation.findMany({ where: open, select: { type: true, status: true, scheduledDate: true } }),
    prisma.operation.findMany({
      where,
      include: { sourceLocation: { include: { warehouse: true } }, destLocation: { include: { warehouse: true } } },
      orderBy: { scheduledDate: "asc" },
      take: 50,
    }),
    prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.stockMove.findMany({
      where: { date: { gte: weekStart } },
      select: { date: true, quantity: true, fromLocationId: true, toLocationId: true },
    }),
  ]);

  // Last 7 days of stock entering (no source location) and leaving (no destination) the company.
  const days: DayFlow[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const moves = weekMoves.filter((m) => m.date >= day && m.date < next);
    return {
      label: i === 6 ? "Today" : day.toLocaleDateString("en-IN", { weekday: "short" }),
      in: moves.filter((m) => !m.fromLocationId).reduce((s, m) => s + m.quantity, 0),
      out: moves.filter((m) => !m.toLocationId).reduce((s, m) => s + m.quantity, 0),
    };
  });

  const valueByCategory = new Map<string, number>();
  for (const p of stock) {
    const name = p.category?.name ?? "Uncategorized";
    valueByCategory.set(name, (valueByCategory.get(name) ?? 0) + Math.max(0, p.onHand) * p.cost);
  }
  const categoryRows = [...valueByCategory].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const inStock = stock.filter((p) => p.onHand > 0).length;
  const lowOrOut = stock.filter((p) => p.isLow || p.isOut);
  const summary = (t: string) => {
    const ops = openOps.filter((o) => o.type === t);
    return {
      toProcess: ops.filter((o) => o.status === "READY").length,
      late: ops.filter(isLate).length,
      waiting: ops.filter((o) => o.status === "WAITING").length,
      total: ops.length,
    };
  };
  const receipts = summary("RECEIPT");
  const deliveries = summary("DELIVERY");
  const transfers = summary("INTERNAL");

  const kpis = [
    { label: "Products in stock", value: inStock, href: "/stock" },
    { label: "Low / out of stock", value: lowOrOut.length, href: "/products", alert: lowOrOut.length > 0 },
    { label: "Pending receipts", value: receipts.total, href: "/operations/receipts" },
    { label: "Pending deliveries", value: deliveries.total, href: "/operations/deliveries" },
    { label: "Internal transfers scheduled", value: transfers.total, href: "/operations/transfers" },
  ];

  return (
    <div className="max-w-6xl">
      <PageHeader title="Dashboard" />
      <Alert message={error} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-rose-400/50">
            <div className={`text-3xl font-semibold ${k.alert ? "text-amber-400" : "text-zinc-100"}`}>{k.value}</div>
            <div className="mt-1 text-xs text-zinc-400">{k.label}</div>
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <OpCard title="Receipt" href="/operations/receipts?status=READY" action={`${receipts.toProcess} to receive`} stats={receipts} />
        <OpCard title="Delivery" href="/operations/deliveries?status=READY" action={`${deliveries.toProcess} to deliver`} stats={deliveries} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-rose-300">Stock movement · last 7 days</h2>
          <InOutChart days={days} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-rose-300">Inventory value by category</h2>
          <CategoryValueChart rows={categoryRows} />
        </Card>
      </div>

      {lowOrOut.length > 0 && (
        <Card className="mb-6 border-amber-500/30">
          <h2 className="mb-3 text-sm font-semibold text-amber-400">Low stock alerts</h2>
          <div className="flex flex-wrap gap-2">
            {lowOrOut.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className={`rounded-md border px-3 py-1.5 text-xs ${p.isOut ? "border-red-500/40 text-red-300" : "border-amber-500/40 text-amber-300"}`}
              >
                {p.name}: {formatQty(p.onHand)} {p.uom} {p.isOut ? "(out)" : `(min ${p.reorderMin})`}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-semibold text-rose-300">Operations</h2>
      <form className="mb-3 flex flex-wrap gap-2">
        <Select name="type" defaultValue={type} className="w-44">
          <option value="">All document types</option>
          {OP_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={status} className="w-36">
          <option value="">All statuses</option>
          {OP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
        <Select name="warehouse" defaultValue={warehouse} className="w-44">
          <option value="">All warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
        <Select name="category" defaultValue={category} className="w-44">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <button className={btn}>Apply</button>
        <Link href="/dashboard" className="self-center text-xs text-zinc-500 hover:text-rose-300">
          Reset
        </Link>
      </form>
      <Table head={["Reference", "Type", "From", "To", "Scheduled", "Status"]} empty={filtered.length === 0}>
        {filtered.map((o) => (
          <tr key={o.id} className="hover:bg-zinc-900">
            <Td>
              <Link href={`/operations/${o.id}`} className="font-mono text-rose-300 hover:underline">
                {o.reference}
              </Link>
            </Td>
            <Td className="text-zinc-400">{TYPE_LABELS[o.type]}</Td>
            <Td>{opFrom(o)}</Td>
            <Td>{opTo(o)}</Td>
            <Td className={isLate(o) ? "text-red-400" : ""}>{formatDate(o.scheduledDate)}</Td>
            <Td>
              <StatusBadge status={o.status} />
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function OpCard({
  title,
  href,
  action,
  stats,
}: {
  title: string;
  href: string;
  action: string;
  stats: { late: number; waiting: number; total: number };
}) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <h3 className="mb-3 text-lg text-rose-300">{title}</h3>
        <Link href={href} className={btn}>
          {action}
        </Link>
      </div>
      <div className="space-y-0.5 text-right text-sm">
        <div className={stats.late ? "text-red-400" : "text-zinc-400"}>{stats.late} Late</div>
        {title === "Delivery" && <div className={stats.waiting ? "text-amber-400" : "text-zinc-400"}>{stats.waiting} Waiting</div>}
        <div className="text-zinc-400">{stats.total} Operations</div>
      </div>
    </Card>
  );
}
