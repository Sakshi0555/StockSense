import { redirect } from "next/navigation";

// Server actions report results through the URL (?error= / ?success=) so pages
// can stay server components with no client state.
export function redirectWith(path: string, params: Record<string, string>): never {
  const [base, existing] = path.split("?");
  const qs = new URLSearchParams(existing);
  for (const [k, v] of Object.entries(params)) qs.set(k, v);
  redirect(`${base}?${qs}`);
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "code" in e && e.code === "P2002") return "That value already exists (must be unique).";
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

// Next.js implements redirect() by throwing; let those through untouched.
export function isRedirect(e: unknown) {
  return e instanceof Error && e.message === "NEXT_REDIRECT";
}
