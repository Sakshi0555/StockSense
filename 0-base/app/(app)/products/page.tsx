import Link from "next/link";
import { Alert, Input, LinkButton, PageHeader, Select, Table, Td, btn } from "@/components/ui";
import { formatQty } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { productStockSummary } from "@/lib/stock";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; success?: string; error?: string }>;
}) {
  const { q = "", category = "", success, error } = await searchParams;
  const [all, categories, user] = await Promise.all([
    productStockSummary(),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    requireUser(),
  ]);
  const canEdit = can(user, "manageProducts");

  const term = q.trim().toLowerCase();
  const products = all.filter(
    (p) =>
      (!term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)) &&
      (!category || p.categoryId === Number(category)),
  );

  return (
    <div className="max-w-6xl">
      <PageHeader title="Products" actions={canEdit ? <LinkButton href="/products/new">New</LinkButton> : undefined}>
        <LinkButton href="/products/categories">Categories</LinkButton>
      </PageHeader>
      <Alert message={error} />
      <Alert message={success} tone="success" />

      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Search by name or SKU…" className="max-w-xs" />
        <Select name="category" defaultValue={category} className="max-w-[200px]">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <button className={btn}>Filter</button>
      </form>

      <Table head={["SKU", "Product", "Category", "UoM", "On hand", "Status"]} empty={products.length === 0}>
        {products.map((p) => (
          <tr key={p.id} className="hover:bg-zinc-900">
            <Td className="font-mono text-rose-300">{p.sku}</Td>
            <Td>
              <Link href={`/products/${p.id}`} className="hover:underline">
                {p.name}
              </Link>
            </Td>
            <Td className="text-zinc-400">{p.category?.name ?? "—"}</Td>
            <Td className="text-zinc-400">{p.uom}</Td>
            <Td>{formatQty(p.onHand)}</Td>
            <Td>
              {p.isOut ? (
                <span className="text-xs font-medium text-red-400">Out of stock</span>
              ) : p.isLow ? (
                <span className="text-xs font-medium text-amber-400">Low stock</span>
              ) : (
                <span className="text-xs text-emerald-400">In stock</span>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
