import { Alert, Card, Field, Input, PageHeader, Select, Table, Td, btnPrimary } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { createLocation, deleteLocation } from "../actions";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  await requirePermission("manageSettings");
  const { error, success } = await searchParams;
  const [locations, warehouses] = await Promise.all([
    prisma.location.findMany({
      include: { warehouse: true, quants: true },
      orderBy: [{ warehouse: { shortCode: "asc" } }, { name: "asc" }],
    }),
    prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-5xl">
      <PageHeader title="Locations" />
      <p className="-mt-3 mb-6 text-sm text-zinc-400">Racks, rooms and zones inside each warehouse.</p>
      <Alert message={error} />
      <Alert message={success} tone="success" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Table head={["Full code", "Name", "Warehouse", "Units in stock", ""]} empty={locations.length === 0}>
          {locations.map((l) => (
            <tr key={l.id}>
              <Td className="font-mono text-rose-300">
                {l.warehouse.shortCode}/{l.shortCode}
              </Td>
              <Td>{l.name}</Td>
              <Td className="text-zinc-400">{l.warehouse.name}</Td>
              <Td>{l.quants.reduce((s, q) => s + q.quantity, 0)}</Td>
              <Td>
                <form action={deleteLocation}>
                  <input type="hidden" name="id" value={l.id} />
                  <button className="text-xs text-zinc-500 hover:text-red-400">Delete</button>
                </form>
              </Td>
            </tr>
          ))}
        </Table>

        <Card>
          <form action={createLocation} className="space-y-4">
            <h2 className="font-semibold">New location</h2>
            <Field label="Name">
              <Input name="name" required placeholder="Rack A" />
            </Field>
            <Field label="Short code">
              <Input name="shortCode" required placeholder="RA" />
            </Field>
            <Field label="Warehouse">
              <Select name="warehouseId" required>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.shortCode} · {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <button className={`${btnPrimary} w-full`} disabled={warehouses.length === 0}>
              Create location
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
