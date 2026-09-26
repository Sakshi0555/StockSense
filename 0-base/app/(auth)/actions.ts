"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MailError, sendOtpEmail } from "@/lib/mailer";
import { createSession, destroySession } from "@/lib/session";
import { validateEmail, validateLoginId, validatePassword } from "@/lib/validation";

function fail(path: string, message: string, extra: Record<string, string> = {}): never {
  const params = new URLSearchParams({ error: message, ...extra });
  redirect(`${path}?${params}`);
}

export async function login(formData: FormData) {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    fail("/login", "Invalid Login Id or Password");
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const keep = { loginId, email };

  const error = validateLoginId(loginId) ?? validateEmail(email) ?? validatePassword(password);
  if (error) fail("/signup", error, keep);
  if (password !== confirm) fail("/signup", "Passwords do not match.", keep);
  if (await prisma.user.findUnique({ where: { loginId } })) fail("/signup", "This Login ID is already taken.", keep);
  if (await prisma.user.findUnique({ where: { email } })) fail("/signup", "An account with this email already exists.", keep);

  // The first account becomes the manager; everyone after joins as staff.
  const role = (await prisma.user.count()) === 0 ? "MANAGER" : "STAFF";
  const user = await prisma.user.create({
    data: { loginId, email, role, password: await bcrypt.hash(password, 10) },
  });
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function requestOtp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) fail("/forgot-password", "No account found with this email.");

  const otp = String(randomInt(100000, 1000000));
  await prisma.user.update({
    where: { id: user.id },
    data: { otp: await bcrypt.hash(otp, 10), otpExpiry: new Date(Date.now() + 10 * 60 * 1000) },
  });
  try {
    await sendOtpEmail(email, otp);
  } catch (e) {
    fail("/forgot-password", e instanceof MailError ? e.message : "Could not send the OTP email.");
  }
  const info = `A 6-digit OTP has been sent to ${email}. Check your inbox (and spam folder).`;
  redirect(`/forgot-password?${new URLSearchParams({ step: "verify", email, info })}`);
}

export async function resetPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const otp = String(formData.get("otp") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const keep = { step: "verify", email };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
    fail("/forgot-password", "OTP expired. Please request a new one.");
  }
  if (!(await bcrypt.compare(otp, user.otp))) fail("/forgot-password", "Invalid OTP.", keep);
  const error = validatePassword(password);
  if (error) fail("/forgot-password", error, keep);
  if (password !== confirm) fail("/forgot-password", "Passwords do not match.", keep);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(password, 10), otp: null, otpExpiry: null },
  });
  redirect(`/login?${new URLSearchParams({ success: "Password reset. Please log in." })}`);
}
