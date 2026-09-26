"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { redirectWith } from "@/lib/redirect";
import { requirePermission, requireUser } from "@/lib/session";
import { validatePassword } from "@/lib/validation";

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim() || null;
  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  redirectWith("/profile", { success: "Profile updated." });
}

export async function updateUserRole(formData: FormData) {
  await requirePermission("manageUsers", "/profile");
  const id = Number(formData.get("userId"));
  const role = String(formData.get("role"));
  if (!["MANAGER", "STAFF"].includes(role)) redirectWith("/profile", { error: "Unknown role." });

  // Never leave the system without a manager.
  if (role === "STAFF") {
    const managers = await prisma.user.count({ where: { role: "MANAGER", id: { not: id } } });
    if (managers === 0) redirectWith("/profile", { error: "There must be at least one manager." });
  }
  const updated = await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/", "layout");
  redirectWith("/profile", { success: `${updated.loginId} is now ${role === "MANAGER" ? "a Manager" : "Staff"}.` });
}

export async function changePassword(formData: FormData) {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(current, record.password))) redirectWith("/profile", { error: "Current password is incorrect." });
  const error = validatePassword(password);
  if (error) redirectWith("/profile", { error });
  if (password !== confirm) redirectWith("/profile", { error: "Passwords do not match." });

  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(password, 10) } });
  redirectWith("/profile", { success: "Password changed." });
}
