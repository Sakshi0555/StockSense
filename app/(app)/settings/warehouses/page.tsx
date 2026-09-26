import { Alert, Card, Field, Input, PageHeader, Table, Td, btn, btnPrimary } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { createWarehouse, updateWarehouse } from "../actions";

export default async function WarehousesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; edit?: string }>;
}) {
  await requirePermission("manageSettings");
  const { error, success, edit } = await searchParams;
  const warehouses = await prisma.warehouse.findMany({
    include: { _count: { select: { locations: true } } },
    orderBy: { name: "asc" },
  });
  const editing = warehouses.find((w) => w.id === Number(edit));

  return (
    <div className="max-w-5xl">
      <PageHeader title="Warehouses" />
      <Alert message={error} />
      <Alert message={success} tone="success" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Table head={["Name", "Short code", "Address", "Locations", ""]} empty={warehouses.length === 0}>
          {warehouses.map((w) => (
            <tr key={w.id}>
              <Td className="font-medium">{w.name}</Td>
              <Td className="font-mono text-rose-300">{w.shortCode}</Td>
              <Td className="text-zinc-400">{w.address || "—"}</Td>
              <Td>{w._count.locations}</Td>
              <Td>
                <a href={`?edit=${w.id}`} className="text-xs text-zinc-400 hover:text-rose-300">
                  Edit
                </a>
              </Td>
            </tr>
          ))}
        </Table>

        <Card>
          {editing ? (
            <form action={updateWarehouse} className="space-y-4">
              <h2 className="font-semibold">Edit {editing.shortCode}</h2>
              <input type="hidden" name="id" value={editing.id} />
              <Field label="Name">
                <Input name="name" defaultValue={editing.name} required />
              </Field>
              <Field label="Address">
                <Input name="address" defaultValue={editing.address ?? ""} />
              </Field>
              <div className="flex gap-2">
                <button className={btnPrimary}>Save</button>
                <a href="/settings/warehouses" className={btn}>
                  Cancel
                </a>
              </div>
            </form>
          ) : (
            <form action={createWarehouse} className="space-y-4">
              <h2 className="font-semibold">New warehouse</h2>
              <Field label="Name">
                <Input name="name" required placeholder="Main Warehouse" />
              </Field>
              <Field label="Short code">
                <Input name="shortCode" required placeholder="WH" maxLength={5} />
              </Field>
              <Field label="Address">
                <Input name="address" placeholder="Optional" />
              </Field>
              <button className={`${btnPrimary} w-full`}>Create warehouse</button>
              <p className="text-xs text-zinc-500">A default &quot;Stock&quot; location is created automatically.</p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
