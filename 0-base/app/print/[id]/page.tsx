import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { TYPE_LABELS, formatDate, formatQty } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { opFrom, opTo } from "@/lib/labels";
import { requireUser } from "@/lib/session";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const op = await prisma.operation.findUnique({
    where: { id: Number(id) },
    include: {
      lines: { include: { product: true } },
      sourceLocation: { include: { warehouse: true } },
      destLocation: { include: { warehouse: true } },
      responsible: true,
    },
  });
  if (!op) notFound();

  return (
    <div className="min-h-screen bg-white p-10 text-black">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold">StockSense</div>
            <div className="text-sm text-gray-500">{TYPE_LABELS[op.type]}</div>
          </div>
          <PrintButton />
        </div>
        <h1 className="mb-6 font-mono text-3xl">{op.reference}</h1>
        <div className="mb-8 grid grid-cols-2 gap-4 text-sm">
          <div><b>From:</b> {opFrom(op)}</div>
          <div><b>To:</b> {opTo(op)}</div>
          <div><b>Scheduled:</b> {formatDate(op.scheduledDate)}</div>
          <div><b>Status:</b> {op.status}</div>
          {op.doneAt && <div><b>Done on:</b> {formatDate(op.doneAt)}</div>}
          <div><b>Responsible:</b> {op.responsible?.name || op.responsible?.loginId}</div>
          {op.address && <div className="col-span-2"><b>Address:</b> {op.address}</div>}
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-2">SKU</th>
              <th className="py-2">Product</th>
              <th className="py-2 text-right">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {op.lines.map((l) => (
              <tr key={l.id} className="border-b border-gray-300">
                <td className="py-2 font-mono">{l.product.sku}</td>
                <td className="py-2">{l.product.name}</td>
                <td className="py-2 text-right">
                  {formatQty(l.quantity)} {l.product.uom}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-16 flex justify-between text-sm text-gray-500">
          <span>Signature: ____________________</span>
          <span>Printed {formatDate(new Date())}</span>
        </div>
      </div>
    </div>
  );
}
