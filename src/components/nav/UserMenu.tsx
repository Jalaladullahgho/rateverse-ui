import Link from "next/link";
import { currentUser, isPlatformAdmin } from "@/lib/session";
import { User, Store, MapPin, Shield, LogOut, Settings } from "lucide-react";

// Server Component: Pure HTML dropdown via <details>/<summary> (no client handlers)
export default async function UserMenu(){
  const user = await currentUser();
  if(!user){
    return (
      <div className="flex items-center gap-2">
        <Link href="/sign-in" className="btn h-9 rounded-xl">Sign in</Link>
        <Link href="/sign-up" className="btn btn-outline h-9 rounded-xl">Sign up</Link>
      </div>
    );
  }

  const admin = await isPlatformAdmin(user.id);

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer flex items-center gap-3 rounded-full px-2 py-1 hover:bg-slate-100 transition">
        <span className="size-9 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-300">
          {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-slate-500"><User size={16} /></div>}
        </span>
        <span className="text-sm max-w-[160px] truncate">{user.full_name || user.email || user.phone}</span>
      </summary>

      <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white shadow-xl p-2 z-50">
        <Link href="/me" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100">
          <User size={16} /> <span>Profile</span>
        </Link>
        <Link href="/me/service" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100">
          <Store size={16} /> <span>My Service</span>
        </Link>
        <Link href="/me/nodes" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100">
          <MapPin size={16} /> <span>My Nodes</span>
        </Link>
        {admin && (
          <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100">
            <Shield size={16} /> <span>Admin</span>
          </Link>
        )}
        <Link href="/contests" className="px-3 py-1 rounded-md hover:bg-white/10">Contests</Link>
{user && (
  <>
    <Link href="/owner/contests" className="px-3 py-1 rounded-md hover:bg-white/10">My Contests</Link>
    <Link href="/owner/contests/new" className="px-3 py-1 rounded-md hover:bg-white/10">+ New</Link>
  </>
)}

        <form action="/api/auth/signout" method="post" className="mt-2">
          <button className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl hover:bg-red-50">
            <LogOut size={16} /> <span>Sign out</span>
          </button>
        </form>
      </div>
    </details>
  );
}
