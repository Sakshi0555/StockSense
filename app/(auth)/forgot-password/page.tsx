import Link from "next/link";
import { Alert, Field, Input, btnPrimary } from "@/components/ui";
import { requestOtp, resetPassword } from "../actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; email?: string; error?: string; info?: string }>;
}) {
  const { step, email, error, info } = await searchParams;

  if (step === "verify" && email) {
    return (
      <form action={resetPassword} className="space-y-4">
        <h2 className="text-lg font-semibold">Reset password</h2>
        <Alert message={info} tone="info" />
        <Alert message={error} />
        <input type="hidden" name="email" value={email} />
        <Field label="OTP">
          <Input name="otp" required inputMode="numeric" maxLength={6} placeholder="6-digit code" />
        </Field>
        <Field label="New password">
          <Input name="password" type="password" required />
        </Field>
        <Field label="Confirm new password">
          <Input name="confirm" type="password" required />
        </Field>
        <button className={`${btnPrimary} w-full`}>Reset password</button>
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-zinc-400 hover:text-rose-300">
            Resend OTP
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form action={requestOtp} className="space-y-4">
      <h2 className="text-lg font-semibold">Forgot password</h2>
      <Alert message={error} />
      <Field label="Registered email">
        <Input name="email" type="email" required />
      </Field>
      <button className={`${btnPrimary} w-full`}>Send OTP</button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-zinc-400 hover:text-rose-300">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
