"use client";

import { useRef, useState } from "react";

export default function AvatarUploader({ value, onChange }:{ value?:string; onChange:(url:string)=>void }){
  const [url, setUrl] = useState<string | undefined>(value);
  const [busy, setBusy] = useState(false);
  const inp = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3">
      <div className="size-14 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-300">
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <div className="flex items-center gap-2">
        <input ref={inp} type="file" accept="image/*" className="hidden" onChange={async (e)=>{
          const f = e.target.files?.[0];
          if(!f) return;
          setBusy(true);
          const fd = new FormData();
          fd.append("file", f);
          const r = await fetch("/api/upload", { method:"POST", body: fd });
          const j = await r.json().catch(()=>({}));
          setBusy(false);
          if(r.ok && j.url){
            setUrl(j.url);
            onChange(j.url);
          }else{
            alert(j.error || "Upload failed");
          }
        }} />
        <button type="button" className="btn btn-outline" onClick={()=>inp.current?.click()} disabled={busy}>
          {busy ? "Uploading..." : (url ? "Change" : "Upload")}
        </button>
        {url && (
          <button type="button" className="btn" onClick={()=>{ setUrl(undefined); onChange(""); }}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
