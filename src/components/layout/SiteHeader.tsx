// src/components/layout/SiteHeader.tsx
import Link from "next/link";
import UserMenu from "@/components/nav/UserMenu";

export default async function SiteHeader(){
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-[var(--rv-bg)] backdrop-blur text-slate-200">
      <div className="mx-auto max-w-7xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Logo + Primary nav */}
        <div className="flex items-center gap-3">
           <img src="/logo-light.svg" alt="" aria-hidden="true" className="h-8"/>
            <span className="size-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 grid place-items-center text-white font-bold">R</span>
            <span className="font-semibold text-white"></span>
         
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <Link href="/" className="px-3 py-1.5 rounded-xl hover:bg-slate-100">Home</Link>
            <Link href="/categories" className="px-3 py-1.5 rounded-xl hover:bg-slate-100">Categories</Link>
            <Link href="/about" className="px-3 py-1.5 rounded-xl hover:bg-slate-100">About</Link>
             {/* Contests (public) */}
            <Link href="/contests" className="px-3 py-1.5 rounded-xl hover:bg-slate-100">Contests</Link>
            {/* Create Contest */}
              
            <Link href="/contests/create" className="px-3 py-1.5 rounded-xl hover:bg-slate-100">Create Contest</Link>
            {/* My Contests */}
            <Link href="/contests/mine" className="px-3 py-1.5 rounded-xl hover:bg-slate-100">My Contests</Link>
  

            {/* Admin Dashboard */}
            <Link href="/admin" className="px-3 py-1.5 rounded-xl hover:bg-slate-100">Admin</Link>
          </nav>
        </div>

        {/* Right: Auth / Profile */}
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
