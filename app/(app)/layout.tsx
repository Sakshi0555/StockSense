import type { ReactNode } from "react";
import { MobileNav, Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/session";
import { logout } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex h-screen">
      <Sidebar user={user} logout={logout} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav role={user.role} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
