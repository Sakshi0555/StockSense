import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-rose-400/60 px-3 py-1.5 text-sm font-medium text-rose-300 hover:bg-rose-400/10 disabled:opacity-40 transition-colors";
export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-rose-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-400 transition-colors";
export const input =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-rose-400 focus:outline-none";

export function PageHeader({ title, actions, children }: { title: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
      <div className="flex items-center gap-3">
        {actions}
        <h1 className="text-2xl font-semibold text-rose-300">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 ${className}`}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${input} ${props.className ?? ""}`} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${input} ${props.className ?? ""}`} />;
}

export function Alert({ message, tone = "error" }: { message?: string | null; tone?: "error" | "success" | "info" }) {
  if (!message) return null;
  const styles = {
    error: "border-red-500/50 bg-red-500/10 text-red-300",
    success: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
    info: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  }[tone];
  return <div className={`mb-4 rounded-md border px-4 py-2 text-sm ${styles}`}>{message}</div>;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-zinc-700/60 text-zinc-200",
  WAITING: "bg-amber-500/20 text-amber-300",
  READY: "bg-sky-500/20 text-sky-300",
  DONE: "bg-emerald-500/20 text-emerald-300",
  CANCELED: "bg-red-500/20 text-red-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="border-b border-rose-400/40 bg-zinc-900 text-left text-xs uppercase tracking-wide text-rose-300">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {children}
          {empty && (
            <tr>
              <td colSpan={head.length} className="px-4 py-8 text-center text-zinc-500">
                Nothing here yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

export function LinkButton({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={primary ? btnPrimary : btn}>
      {children}
    </Link>
  );
}
