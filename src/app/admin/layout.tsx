import Link from "next/link";
import { ReactNode } from "react";
import { currentUser, isPlatformAdmin } from "@/lib/session";
import CommandPalette from "@/components/admin/CommandPalette";
import CommandButton from "@/components/admin/CommandButton";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/geo", label: "Geo" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/mapping", label: "Mapping" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/security", label: "Security" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }:{ children: ReactNode }) {
  const user = await currentUser();
  const ok = await isPlatformAdmin(user?.id);
  if(!user || !ok){
    return <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Access denied</h1>
      <p className="text-slate-600">You need platform_admin role to view this page.</p>
    </div>;
  }

  return (
    <div className="grid md:grid-cols-[240px_1fr] min-h-[calc(100vh-64px)]">
      <aside className="border-r border-slate-200 p-4">
        <div className="font-semibold mb-4">Admin</div>
        <nav className="flex flex-col gap-1">
          {NAV.map(item => (
            <Link key={item.href} href={item.href} className="px-3 py-2 rounded-md hover:bg-slate-100 text-sm">{item.label}</Link>
          ))}
        </nav>
        <div className="mt-6">
          <CommandButton />
        </div>
      </aside>
      <main className="p-6">
        <CommandPalette />
        {children}
      </main>
    </div>
  );
}
