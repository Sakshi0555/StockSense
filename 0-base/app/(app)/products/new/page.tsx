import { Alert, Card, Field, Input, PageHeader, Select, btnPrimary } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { createProduct } from "../actions";
import { ProductFields } from "../ProductFields";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requirePermission("manageProducts", "/products");
  const { error } = await searchParams;
  const [categories, locations] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ include: { warehouse: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="New product" />
      <Alert message={error} />
      <Card>
        <form action={createProduct}>
          <ProductFields categories={categories} />
          <div className="mt-6 border-t border-zinc-800 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-rose-300">Initial stock (optional)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quantity">
                <Input name="initialQty" type="number" min="0" step="any" defaultValue={0} />
              </Field>
              <Field label="Location">
                <Select name="locationId">
                  <option value="">— Select —</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.warehouse.shortCode}/{l.shortCode}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          <button className={`${btnPrimary} mt-6`}>Create product</button>
        </form>
      </Card>
    </div>
  );
}
