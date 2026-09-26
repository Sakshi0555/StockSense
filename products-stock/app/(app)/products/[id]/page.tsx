import { notFound } from "next/navigation";
import { Alert, Card, PageHeader, Table, Td, btnPrimary } from "@/components/ui";
import { formatQty } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { updateProduct } from "../actions";
import { ProductFields } from "../ProductFields";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { error, success } = await searchParams;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: Number(id) },
      include: { quants: { include: { location: { include: { warehouse: true } } } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();
  const canEdit = can(await requireUser(), "manageProducts");

  const onHand = product.quants.reduce((s, q) => s + q.quantity, 0);
  const needsReorder = onHand <= product.reorderMin;

  return (
    <div className="max-w-5xl">
      <PageHeader title={`[${product.sku}] ${product.name}`} />
      <Alert message={error} />
      <Alert message={success} tone="success" />
      {needsReorder && (
        <Alert
          tone="info"
          message={`Stock (${formatQty(onHand)} ${product.uom}) is at or below the threshold of ${product.reorderMin}. Suggested reorder: ${product.reorderQty} ${product.uom}.`}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <form action={updateProduct}>
            <input type="hidden" name="id" value={product.id} />
            <fieldset disabled={!canEdit}>
              <ProductFields product={product} categories={categories} />
            </fieldset>
            {canEdit ? (
              <button className={`${btnPrimary} mt-6`}>Save changes</button>
            ) : (
              <p className="mt-6 text-xs text-zinc-500">Only managers can edit products.</p>
            )}
          </form>
        </Card>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-rose-300">Stock by location</h2>
          <Table head={["Location", "Qty"]} empty={product.quants.length === 0}>
            {product.quants.map((q) => (
              <tr key={q.id}>
                <Td className="font-mono">
                  {q.location.warehouse.shortCode}/{q.location.shortCode}
                </Td>
                <Td>{formatQty(q.quantity)}</Td>
              </tr>
            ))}
          </Table>
          <p className="mt-2 text-sm text-zinc-400">
            Total: {formatQty(onHand)} {product.uom}
          </p>
        </div>
      </div>
    </div>
  );
}
