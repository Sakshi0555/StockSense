import { Alert, Card, Field, Input, PageHeader, Table, Td, btnPrimary } from "@/components/ui";
import { prisma } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { createCategory } from "../actions";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { error, success } = await searchParams;
  const canEdit = can(await requireUser(), "manageProducts");
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <PageHeader title="Product categories" />
      <Alert message={error} />
      <Alert message={success} tone="success" />
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <Table head={["Category", "Products"]} empty={categories.length === 0}>
          {categories.map((c) => (
            <tr key={c.id}>
              <Td>{c.name}</Td>
              <Td>{c._count.products}</Td>
            </tr>
          ))}
        </Table>
        {canEdit && (
          <Card>
            <form action={createCategory} className="space-y-4">
              <Field label="New category">
                <Input name="name" required placeholder="Furniture" />
              </Field>
              <button className={`${btnPrimary} w-full`}>Add category</button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
