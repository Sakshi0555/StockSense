import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card, Field, Input, LinkButton, PageHeader, Select, StatusBadge, Table, Td, btn, btnPrimary } from "@/components/ui";
import { STATUS_FLOW, TYPE_LABELS, TYPE_ROUTES, formatDate, formatQty, isLate } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { locLabel, opFrom, opTo } from "@/lib/labels";
import { can, operationPermission, requireUser } from "@/lib/session";
import { addLine, cancelAction, confirmAction, removeLine, updateOperationHeader, validateAction } from "../actions";

export default async function OperationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { error, success } = await searchParams;
  const op = await prisma.operation.findUnique({
    where: { id: Number(id) },
    include: {
      lines: { include: { product: true }, orderBy: { id: "asc" } },
      sourceLocation: { include: { warehouse: true } },
      destLocation: { include: { warehouse: true } },
      responsible: true,
    },
  });
  if (!op) notFound();

  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  const canEdit = can(await requireUser(), operationPermission(op.type));
  const editable = canEdit && (op.status === "DRAFT" || op.status === "WAITING");
  const outgoing = op.type === "DELIVERY" || op.type === "INTERNAL";

  // Availability at the source location, used to flag lines red when stock is short.
  const available = new Map<number, number>();
  if (outgoing && op.sourceLocationId && op.status !== "DONE") {
    const quants = await prisma.stockQuant.findMany({
      where: { locationId: op.sourceLocationId, productId: { in: op.lines.map((l) => l.productId) } },
    });
    for (const q of quants) available.set(q.productId, q.quantity);
  }
  const isShort = (productId: number, qty: number) => outgoing && op.status !== "DONE" && qty > (available.get(productId) ?? 0);
  const shortLines = op.lines.filter((l) => isShort(l.productId, l.quantity));

  const flow = STATUS_FLOW[op.type] ?? [];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={TYPE_LABELS[op.type]}
        actions={canEdit ? <LinkButton href={`/operations/new?type=${op.type}`}>New</LinkButton> : undefined}
      >
        <Link href={TYPE_ROUTES[op.type]} className="text-sm text-zinc-400 hover:text-rose-300">
          ← Back to list
        </Link>
      </PageHeader>
      <Alert message={error} />
      <Alert message={success} tone="success" />
      {shortLines.length > 0 && (
        <Alert message={`Not enough stock at ${locLabel(op.sourceLocation)} for: ${shortLines.map((l) => l.product.name).join(", ")}.`} />
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!canEdit && op.status !== "DONE" && <span className="text-xs text-zinc-500">View only: a manager processes this operation.</span>}
          {canEdit && (op.status === "DRAFT" || op.status === "WAITING") && (
            <form action={confirmAction}>
              <input type="hidden" name="id" value={op.id} />
              <button className={btnPrimary}>{op.status === "DRAFT" ? "Mark as To Do" : "Check availability"}</button>
            </form>
          )}
          {canEdit && op.status === "READY" && (
            <form action={validateAction}>
              <input type="hidden" name="id" value={op.id} />
              <button className={btnPrimary}>Validate</button>
            </form>
          )}
          {op.status === "DONE" && (
            <Link href={`/print/${op.id}`} target="_blank" className={btn}>
              Print
            </Link>
          )}
          {canEdit && op.status !== "DONE" && op.status !== "CANCELED" && (
            <form action={cancelAction}>
              <input type="hidden" name="id" value={op.id} />
              <button className={btn}>Cancel</button>
            </form>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-sm">
          {op.status === "CANCELED" ? (
            <StatusBadge status="CANCELED" />
          ) : (
            flow.map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                {i > 0 && <span className="text-zinc-600">›</span>}
                <span className={s === op.status ? "font-semibold text-rose-300" : "text-zinc-500"}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </span>
              </span>
            ))
          )}
        </div>
      </div>

      <Card className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-mono text-xl text-rose-300">{op.reference}</h2>
          {isLate(op) && <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-300">Late</span>}
        </div>
        {canEdit && op.status === "DRAFT" ? (
          <form action={updateOperationHeader} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={op.id} />
            {op.type !== "INTERNAL" && (
              <Field label={op.type === "RECEIPT" ? "Receive from" : "Customer"}>
                <Input name="contact" defaultValue={op.contact ?? ""} />
              </Field>
            )}
            {op.type === "DELIVERY" && (
              <Field label="Delivery address">
                <Input name="address" defaultValue={op.address ?? ""} />
              </Field>
            )}
            <Field label="Schedule date">
              <Input name="scheduledDate" type="date" defaultValue={op.scheduledDate.toISOString().slice(0, 10)} />
            </Field>
            <ReadOnly label="From" value={opFrom(op)} />
            <ReadOnly label="To" value={opTo(op)} />
            <ReadOnly label="Responsible" value={op.responsible?.name || op.responsible?.loginId || "—"} />
            <div className="sm:col-span-2">
              <button className={btn}>Save</button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <ReadOnly label="From" value={opFrom(op)} />
            <ReadOnly label="To" value={opTo(op)} />
            <ReadOnly label="Schedule date" value={formatDate(op.scheduledDate)} />
            {op.address && <ReadOnly label="Delivery address" value={op.address} />}
            <ReadOnly label="Responsible" value={op.responsible?.name || op.responsible?.loginId || "—"} />
            <ReadOnly label="Operation type" value={TYPE_LABELS[op.type]} />
            {op.doneAt && <ReadOnly label="Done on" value={formatDate(op.doneAt)} />}
          </div>
        )}
      </Card>

      <h3 className="mb-2 text-sm font-semibold text-rose-300">Products</h3>
      <Table head={outgoing ? ["Product", "Quantity", "Available", ""] : ["Product", "Quantity", ""]} empty={op.lines.length === 0}>
        {op.lines.map((l) => {
          const short = isShort(l.productId, l.quantity);
          return (
            <tr key={l.id} className={short ? "bg-red-500/10 text-red-300" : ""}>
              <Td>
                [{l.product.sku}] {l.product.name}
              </Td>
              <Td>
                {formatQty(l.quantity)} {l.product.uom}
              </Td>
              {outgoing && <Td>{op.status === "DONE" ? "—" : formatQty(available.get(l.productId) ?? 0)}</Td>}
              <Td className="text-right">
                {editable && (
                  <form action={removeLine}>
                    <input type="hidden" name="lineId" value={l.id} />
                    <button className="text-xs text-zinc-500 hover:text-red-400">Remove</button>
                  </form>
                )}
              </Td>
            </tr>
          );
        })}
      </Table>

      {editable && (
        <form action={addLine} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="operationId" value={op.id} />
          <div className="min-w-[240px] flex-1">
            <Field label="Add product">
              <Select name="productId" required>
                <option value="">— Select product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-32">
            <Field label="Quantity">
              <Input name="quantity" type="number" min="0.01" step="any" required />
            </Field>
          </div>
          <button className={btn}>Add line</button>
        </form>
      )}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-sm">{value || "—"}</div>
    </div>
  );
}
