import Link from "next/link";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const items = [
  { href:"/me", label:"Overview" },
  { href:"/me/profile", label:"Profile" },
  { href:"/me/service", label:"My Service" },
  { href:"/me/nodes", label:"My Nodes" },
  { href:"/me/reviews", label:"My Reviews" },
  { href:"/me/wallet", label:"Wallet" },
  { href:"/me/sessions", label:"Sessions" },
  { href:"/me/settings", label:"Settings" },
  { href:"/me/nfc", label:"NFC & QR" },
];

export default async function MeLayout({ children }:{ children:React.ReactNode }){
  const user = await currentUser();
  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-4">
      <aside className="bg-white border rounded-2xl p-4 h-fit sticky top-20">
        <div className="font-semibold mb-3">My account</div>
        <nav className="grid gap-1">
          {items.map(x=>(
            <Link key={x.href} href={x.href} className="px-3 py-2 rounded-lg hover:bg-slate-100">{x.label}</Link>
          ))}
        </nav>
        <div className="mt-6 text-xs text-slate-500 break-all">
          {user ? user.email : "Not signed in"}
        </div>
      </aside>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
