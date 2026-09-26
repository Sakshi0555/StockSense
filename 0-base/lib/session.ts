import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, signToken, verifyToken } from "./jwt";
import { redirectWith } from "./redirect";

// Managers handle incoming/outgoing stock, the catalog and settings.
// Staff handle transfers and stock counts; everything else is read-only for them.
const PERMISSIONS = {
  manageReceiptsDeliveries: ["MANAGER"],
  manageTransfers: ["MANAGER", "STAFF"],
  adjustStock: ["MANAGER", "STAFF"],
  manageProducts: ["MANAGER"],
  manageSettings: ["MANAGER"],
  manageUsers: ["MANAGER"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(user: { role: string } | null | undefined, permission: Permission) {
  return !!user && (PERMISSIONS[permission] as readonly string[]).includes(user.role);
}

export function operationPermission(type: string): Permission {
  return type === "INTERNAL" ? "manageTransfers" : "manageReceiptsDeliveries";
}

// Server-side guard for actions and manager-only pages.
export async function requirePermission(permission: Permission, back = "/dashboard") {
  const user = await requireUser();
  if (!can(user, permission)) redirectWith(back, { error: "You don't have permission to do that. Ask a manager." });
  return user;
}

export async function createSession(userId: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const store = await cookies();
  const session = await verifyToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, loginId: true, email: true, name: true, role: true, createdAt: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
