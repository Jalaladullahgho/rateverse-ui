"use client";
import useSWR from "swr";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import CountrySelect from "@/components/common/CountrySelect";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function HomeSections(){
  const [country, setCountry] = useState<string>("");
  const [q, setQ] = useState<string>("");


  const { data: highlights } = useSWR(`/api/home/highlights?country=${country}&q=${encodeURIComponent(q)}`, fetcher);

  const scrollerRef = useRef<HTMLDivElement>(null);
  function scroll(dx: number){
    scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  }

  return (
    <div className="space-y-10">
      {/* Search + Country */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 border rounded-xl p-2 bg-white">
          <input
            className="flex-1 outline-none px-2"
            placeholder="Search for a service..."
            value={q}
            onChange={(e)=>setQ(e.target.value)}
          />
          <button className="btn btn-outline">Search</button>
        </div>
       <CountrySelect
  variant="native"
  value={country}
  onChange={(code)=> setCountry(code)}
  placeholder="All countries"
/>

      </div>

      {/* Section 1: categories horizontal */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">What are you looking for?</h2>
          <div className="hidden md:flex items-center gap-2">
            <button className="btn btn-outline" onClick={()=>scroll(-400)} aria-label="Scroll left"><ChevronLeft size={16}/></button>
            <button className="btn btn-outline" onClick={()=>scroll(400)} aria-label="Scroll right"><ChevronRight size={16}/></button>
          </div>
        </div>
        <div ref={scrollerRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-2 whitespace-nowrap">
          {(highlights?.categories || []).map((c:any)=>(
            <a key={c.id} href={`/category/${c.id}`} className="chip hover:bg-slate-100">
              <Icon name={c.icon_key} className="mr-2 h-4 w-4 inline" />
              {c.name}
            </a>
          ))}
        </div>
      </section>

     {/* Section 2: Best services */}
<section className="space-y-3">
  <h2 className="text-xl font-semibold">Best services</h2>
  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {(highlights?.best_services ?? []).map((s:any)=>(
      <div key={s.id} className="card p-4 hover:shadow transition-shadow duration-150">
        <div className="space-y-1">
          <div className="font-semibold line-clamp-1" dir="auto">{s.name}</div>
          <div className="text-sm text-slate-600 line-clamp-1">
            {[s.city, s.country].filter(Boolean).join(" • ")}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ⭐ {s.avg_rating ?? "—"} • R-Score {s.r_score ?? "—"} • {s.reviews ?? 0} reviews
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/s/${s.slug}`} className="btn">Open</Link>
          <Link href={`/s/${s.slug}/review`} className="btn btn-primary">Write a review</Link>
        </div>
      </div>
    ))}
  </div>
</section>

      {/* Section 3: latest reviews */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Latest reviews</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(highlights?.latest_reviews || []).map((r:any)=>(
            <div key={r.id} className="card">
              <div className="font-semibold" dir="auto">{r.node_name}</div>
              <div className="text-sm text-slate-700 line-clamp-2" dir="auto">{r.title || r.body || "Review"}</div>
              <div className="text-xs text-slate-500 mt-2">{new Date(r.submitted_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
