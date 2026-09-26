import { Alert, Card, Field, Input, PageHeader, Select, btnPrimary } from "@/components/ui";
import { TYPE_LABELS, TYPE_ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { locLabel } from "@/lib/labels";
import { operationPermission, requirePermission } from "@/lib/session";
import { createOperation } from "../actions";

export default async function NewOperationPage({ searchParams }: { searchParams: Promise<{ type?: string; error?: string }> }) {
  const { type = "RECEIPT", error } = await searchParams;
  const user = await requirePermission(operationPermission(type), TYPE_ROUTES[type] ?? "/dashboard");
  const locations = await prisma.location.findMany({ include: { warehouse: true }, orderBy: { name: "asc" } });
  const today = new Date().toISOString().slice(0, 10);

  const locationSelect = (name: string) => (
    <Select name={name} required>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {locLabel(l)} · {l.name}
        </option>
      ))}
    </Select>
  );

  return (
    <div className="max-w-3xl">
      <PageHeader title={`New ${TYPE_LABELS[type] ?? "operation"}`} />
      <Alert message={error} />
      {locations.length === 0 && <Alert tone="info" message="Create a warehouse in Settings first." />}
      <Card>
        <form action={createOperation} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="type" value={type} />
          {type === "RECEIPT" && (
            <>
              <Field label="Receive from (vendor)">
                <Input name="contact" placeholder="Azure Interior" />
              </Field>
              <Field label="Destination location">{locationSelect("destLocationId")}</Field>
            </>
          )}
          {type === "DELIVERY" && (
            <>
              <Field label="Customer">
                <Input name="contact" placeholder="Azure Interior" />
              </Field>
              <Field label="Delivery address">
                <Input name="address" />
              </Field>
              <Field label="Source location">{locationSelect("sourceLocationId")}</Field>
            </>
          )}
          {type === "INTERNAL" && (
            <>
              <Field label="Source location">{locationSelect("sourceLocationId")}</Field>
              <Field label="Destination location">{locationSelect("destLocationId")}</Field>
            </>
          )}
          <Field label="Schedule date">
            <Input name="scheduledDate" type="date" defaultValue={today} required />
          </Field>
          <Field label="Responsible">
            <Input value={user.name || user.loginId} disabled />
          </Field>
          <div className="sm:col-span-2">
            <button className={btnPrimary} disabled={locations.length === 0}>
              Create
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
