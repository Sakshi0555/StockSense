import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl border-2 border-rose-400 text-2xl font-bold text-rose-400">
            S
          </div>
          <h1 className="text-2xl font-bold text-rose-300">StockSense</h1>
          <p className="text-sm text-zinc-400">Inventory management, simplified</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">{children}</div>
      </div>
    </main>
  );
}
