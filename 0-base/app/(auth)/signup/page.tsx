import Link from "next/link";
import { Alert, Field, Input, btnPrimary } from "@/components/ui";
import { signup } from "../actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; loginId?: string; email?: string }>;
}) {
  const { error, loginId, email } = await searchParams;
  return (
    <form action={signup} className="space-y-4">
      <h2 className="text-lg font-semibold">Create account</h2>
      <Alert message={error} />
      <Field label="Login ID (6–12 characters)">
        <Input name="loginId" required minLength={6} maxLength={12} defaultValue={loginId} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required defaultValue={email} />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required minLength={8} />
      </Field>
      <Field label="Re-enter password">
        <Input name="confirm" type="password" required />
      </Field>
      <p className="text-xs text-zinc-500">
        At least 8 characters with a lowercase letter, an uppercase letter and a special character.
      </p>
      <button className={`${btnPrimary} w-full`}>Sign up</button>
      <p className="text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="text-rose-300">
          Sign in
        </Link>
      </p>
    </form>
  );
}
