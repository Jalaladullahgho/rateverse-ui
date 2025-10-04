
"use client";
import { useEffect, useRef, useState } from "react";

type Item = { label: string; href: string; type: string };

export default function CommandPalette(){
  const [open,setOpen] = useState(false);
  const [q,setQ] = useState("");
  const [items,setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    (window as any).openCommandPalette = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); setOpen(true); }
      if (e.key==="Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(()=>{
    if (open) setTimeout(()=>inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(()=>{
    let active = true;
    (async ()=>{
      const r = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
      const data = await r.json().catch(()=>[]);
      if(active) setItems(data||[]);
    })();
    return ()=>{ active=false; };
  }, [q]);

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-8" onClick={()=>setOpen(false)}>
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl p-4" onClick={e=>e.stopPropagation()}>
        <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search services, nodes, reviews..."
          className="w-full h-10 px-3 rounded-md border border-slate-300 outline-none" />
        <div className="mt-3 max-h-80 overflow-auto">
          {items.map((it,idx)=>(
            <a key={idx} href={it.href} className="flex items-center justify-between px-3 py-2 rounded hover:bg-slate-50">
              <div>
                <div className="font-medium">{it.label}</div>
                <div className="text-xs text-slate-500">{it.type}</div>
              </div>
              <div className="text-xs text-slate-400">↩</div>
            </a>
          ))}
          {items.length===0 && <div className="text-slate-500 text-sm px-3 py-4">No results.</div>}
        </div>
      </div>
    </div>
  );
}
