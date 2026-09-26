"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { section: "Operations" },
  { href: "/operations/receipts", label: "Receipts" },
  { href: "/operations/deliveries", label: "Deliveries" },
  { href: "/operations/transfers", label: "Internal Transfers" },
  { href: "/operations/adjustments", label: "Adjustments" },
  { section: "Inventory" },
  { href: "/products", label: "Products" },
  { href: "/stock", label: "Stock" },
  { href: "/moves", label: "Move History" },
  { section: "Settings", managerOnly: true },
  { href: "/settings/warehouses", label: "Warehouses", managerOnly: true },
  { href: "/settings/locations", label: "Locations", managerOnly: true },
] as const;

// Settings are manager-only; staff do not see them in the menu.
function visibleNav(role: string) {
  return NAV.filter((item) => role === "MANAGER" || !("managerOnly" in item));
}

export function Sidebar({
  user,
  logout,
}: {
  user: { loginId: string; name: string | null; role: string };
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 max-md:hidden">
      <div className="px-5 py-5 text-xl font-bold tracking-tight text-rose-400">StockSense</div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {visibleNav(user.role).map((item) =>
          "section" in item ? (
            <div key={item.section} className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {item.section}
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm ${
                pathname.startsWith(item.href) ? "bg-rose-500/15 text-rose-300" : "text-zinc-300 hover:bg-zinc-800/70"
              }`}
            >
              {item.label}
            </Link>
          ),
        )}
      </nav>
      <div className="border-t border-zinc-800 p-3">
        <Link
          href="/profile"
          className={`flex items-center gap-3 rounded-md px-2 py-2 hover:bg-zinc-800/70 ${pathname === "/profile" ? "bg-rose-500/15" : ""}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-400 text-sm text-rose-300">
            {(user.name || user.loginId).charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-zinc-200">{user.name || user.loginId}</span>
            <span className="block text-[11px] uppercase tracking-wide text-rose-300/80">
              {user.role === "MANAGER" ? "Inventory Manager" : "Warehouse Staff"}
            </span>
          </span>
        </Link>
        <form action={logout}>
          <button className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-800/70 hover:text-rose-300">
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}

export function MobileNav({ role }: { role: string }) {
  return (
    <div className="flex gap-3 overflow-x-auto border-b border-zinc-800 px-4 py-3 text-sm md:hidden">
      {visibleNav(role).map((n) =>
        "href" in n ? (
          <Link key={n.href} href={n.href} className="whitespace-nowrap text-zinc-300">
            {n.label}
          </Link>
        ) : null,
      )}
    </div>
  );
}
