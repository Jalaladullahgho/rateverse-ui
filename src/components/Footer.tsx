import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-[var(--rv-bg)] text-slate-200">
      <div className="mx-auto max-w-7xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo-light.svg" alt="" aria-hidden="true" className="h-8" />
          <span className="font-semibold text-white"></span>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/categories" className="hover:text-white">Categories</Link>
          <Link href="/about" className="hover:text-white">About</Link>
        </nav>
        <p className="text-xs">© {new Date().getFullYear()} Rateverse</p>
      </div>
    </footer>
  );
}
