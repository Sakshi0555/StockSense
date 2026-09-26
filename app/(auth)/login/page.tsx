import Link from "next/link";
import { Alert, Field, Input, btnPrimary } from "@/components/ui";
import { login } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { error, success } = await searchParams;
  return (
    <form action={login} className="space-y-4">
      <h2 className="text-lg font-semibold">Sign in</h2>
      <Alert message={error} />
      <Alert message={success} tone="success" />
      <Field label="Login ID">
        <Input name="loginId" required autoComplete="username" />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required autoComplete="current-password" />
      </Field>
      <button className={`${btnPrimary} w-full`}>Sign in</button>
      <p className="text-center text-sm text-zinc-400">
        <Link href="/forgot-password" className="hover:text-rose-300">
          Forgot password?
        </Link>
        <span className="px-2">|</span>
        <Link href="/signup" className="hover:text-rose-300">
          Sign up
        </Link>
      </p>
    </form>
  );
}
