import { Alert, Card, Field, Input, PageHeader, Select, Table, Td, btn, btnPrimary } from "@/components/ui";
import { formatDate } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { can, requireUser } from "@/lib/session";
import { logout } from "../../(auth)/actions";
import { changePassword, updateProfile, updateUserRole } from "./actions";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { error, success } = await searchParams;
  const user = await requireUser();
  const opCount = await prisma.operation.count({ where: { responsibleId: user.id } });
  const isManager = can(user, "manageUsers");
  const team = isManager
    ? await prisma.user.findMany({ select: { id: true, loginId: true, name: true, email: true, role: true }, orderBy: { createdAt: "asc" } })
    : [];

  return (
    <div className="max-w-3xl">
      <PageHeader title="My Profile">
        <form action={logout}>
          <button className={btn}>Logout</button>
        </form>
      </PageHeader>
      <Alert message={error} />
      <Alert message={success} tone="success" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <form action={updateProfile} className="space-y-4">
            <Field label="Login ID">
              <Input value={user.loginId} disabled />
            </Field>
            <Field label="Email">
              <Input value={user.email} disabled />
            </Field>
            <Field label="Role">
              <Input value={user.role === "MANAGER" ? "Inventory Manager" : "Warehouse Staff"} disabled />
            </Field>
            <Field label="Display name">
              <Input name="name" defaultValue={user.name ?? ""} />
            </Field>
            <p className="text-xs text-zinc-500">
              Member since {formatDate(user.createdAt)} · {opCount} operations handled
            </p>
            <button className={btnPrimary}>Save</button>
          </form>
        </Card>
        <Card>
          <form action={changePassword} className="space-y-4">
            <h2 className="font-semibold">Change password</h2>
            <Field label="Current password">
              <Input name="current" type="password" required />
            </Field>
            <Field label="New password">
              <Input name="password" type="password" required />
            </Field>
            <Field label="Confirm new password">
              <Input name="confirm" type="password" required />
            </Field>
            <button className={btn}>Update password</button>
          </form>
        </Card>
      </div>

      {isManager && (
        <div className="mt-8">
          <h2 className="mb-1 text-lg font-semibold text-rose-300">Team &amp; roles</h2>
          <p className="mb-3 text-sm text-zinc-400">
            Managers handle receipts, deliveries, products and settings. Staff handle transfers and stock counts.
          </p>
          <Table head={["Login ID", "Name", "Email", "Role"]}>
            {team.map((m) => (
              <tr key={m.id}>
                <Td className="font-mono">{m.loginId}</Td>
                <Td>{m.name || "—"}</Td>
                <Td className="text-zinc-400">{m.email}</Td>
                <Td>
                  <form action={updateUserRole} className="flex gap-2">
                    <input type="hidden" name="userId" value={m.id} />
                    <Select name="role" defaultValue={m.role} className="w-36 py-1">
                      <option value="MANAGER">Manager</option>
                      <option value="STAFF">Staff</option>
                    </Select>
                    <button className="rounded border border-zinc-700 px-2 text-xs hover:border-rose-400">Save</button>
                  </form>
                </Td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </div>
  );
}
