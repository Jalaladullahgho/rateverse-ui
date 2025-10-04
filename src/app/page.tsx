import Link from "next/link";
import HomeSections from "@/components/home/Sections";

export default function Page() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl p-8 border bg-gradient-to-br from-indigo-50 to-sky-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-slate-900">Discover, try, write a review</h1>
            <p className="text-slate-600">Find services you love. Share your experience.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/categories" className="btn btn-outline">Browse categories</Link>
            <Link href="/sign-in" className="btn btn-outline">Login</Link>
            <Link href="/sign-up" className="btn btn-primary">Sign up</Link>
          </div>
        </div>
      </section>

      <HomeSections />
    </div>
  );
}
