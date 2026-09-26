import Link from "next/link";
import { Alert, Input, LinkButton, PageHeader, Select, StatusBadge, Table, Td, btn } from "@/components/ui";
import { STATUS_FLOW, TYPE_LABELS, formatDate, isLate } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { opFrom, opTo } from "@/lib/labels";
import { can, operationPermission, requireUser } from "@/lib/session";

// Shared list/kanban view for Receipts, Deliveries and Internal Transfers.
export async function OperationList({
  type,
  title,
  searchParams,
}: {
  type: string;
  title: string;
  searchParams: { q?: string; status?: string; view?: string; error?: string };
}) {
  const { q = "", status = "", view = "list", error } = searchParams;
  const term = q.trim();

  const operations = await prisma.operation.findMany({
    where: {
      type,
      status: status || undefined,
      OR: term ? [{ reference: { contains: term } }, { contact: { contains: term } }] : undefined,
    },
    include: {
      sourceLocation: { include: { warehouse: true } },
      destLocation: { include: { warehouse: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const canEdit = can(await requireUser(), operationPermission(type));
  const statuses = [...STATUS_FLOW[type], "CANCELED"];
  const qs = (v: string) => `?${new URLSearchParams({ q, status, view: v })}`;

  return (
    <div className="max-w-6xl">
      <PageHeader title={title} actions={canEdit ? <LinkButton href={`/operations/new?type=${type}`}>New</LinkButton> : undefined}>
        <form className="flex gap-2">
          <input type="hidden" name="view" value={view} />
          <Input name="q" defaultValue={q} placeholder="Search reference or contact…" className="w-56" />
          <Select name="status" defaultValue={status} className="w-32">
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          <button className={btn}>Search</button>
        </form>
        <div className="flex overflow-hidden rounded-md border border-zinc-700 text-sm">
          <Link href={qs("list")} className={`px-3 py-1.5 ${view === "list" ? "bg-rose-500/20 text-rose-300" : "text-zinc-400"}`}>
            List
          </Link>
          <Link href={qs("kanban")} className={`px-3 py-1.5 ${view === "kanban" ? "bg-rose-500/20 text-rose-300" : "text-zinc-400"}`}>
            Kanban
          </Link>
        </div>
      </PageHeader>
      <Alert message={error} />

      {view === "kanban" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statuses.map((s) => {
            const col = operations.filter((o) => o.status === s);
            return (
              <div key={s} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <StatusBadge status={s} />
                  <span className="text-xs text-zinc-500">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((o) => (
                    <Link key={o.id} href={`/operations/${o.id}`} className="block rounded-lg border border-zinc-800 bg-zinc-950 p-3 hover:border-rose-400/50">
                      <div className="font-mono text-sm text-rose-300">{o.reference}</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {opFrom(o)} → {opTo(o)}
                      </div>
                      <div className={`mt-1 text-xs ${isLate(o) ? "text-red-400" : "text-zinc-500"}`}>
                        {formatDate(o.scheduledDate)}
                        {isLate(o) && " · Late"}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Table head={["Reference", "From", "To", "Contact", "Scheduled", "Status"]} empty={operations.length === 0}>
          {operations.map((o) => (
            <tr key={o.id} className="hover:bg-zinc-900">
              <Td>
                <Link href={`/operations/${o.id}`} className="font-mono text-rose-300 hover:underline">
                  {o.reference}
                </Link>
              </Td>
              <Td>{opFrom(o)}</Td>
              <Td>{opTo(o)}</Td>
              <Td className="text-zinc-400">{o.contact || "—"}</Td>
              <Td className={isLate(o) ? "text-red-400" : ""}>
                {formatDate(o.scheduledDate)}
                {isLate(o) && <span className="ml-1 text-xs">(Late)</span>}
              </Td>
              <Td>
                <StatusBadge status={o.status} />
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <p className="mt-3 text-xs text-zinc-500">{TYPE_LABELS[type]} operations · {operations.length} shown</p>
    </div>
  );
}
