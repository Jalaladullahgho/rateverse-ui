"use client";
import { useRef, useState } from "react";

export default function AvatarUploader({
  onUploaded,
  targetInputId,
}:{
  onUploaded?:(url:string)=>void;
  targetInputId?: string;
}){
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy,setBusy] = useState(false);
  const [msg,setMsg] = useState<string>("");

  async function upload(){
    const f = fileRef.current?.files?.[0];
    if(!f) return;
    const fd = new FormData();
    fd.append("file", f);
    setBusy(true); setMsg("");
    try{
      const r = await fetch("/api/upload",{ method:"POST", body:fd });
      const j = await r.json();
      if(r.ok && j.url){
        // مرّر الرابط للخارج
        onUploaded?.(j.url);
        // واملأ الحقل المخفي إن وجد
        if (targetInputId){
          const el = document.getElementById(targetInputId) as HTMLInputElement | null;
          if(el) el.value = j.url;
        }
        setMsg("Uploaded");
      }else{
        setMsg(j.error || "Upload failed");
      }
    }catch(e:any){
      setMsg(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3">
      <input ref={fileRef} type="file" accept="image/*" className="text-sm" />
      <button type="button" onClick={upload} disabled={busy} className="px-3 h-9 rounded-lg bg-slate-900 text-white">
        {busy ? "Uploading..." : "Upload"}
      </button>
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </div>
  );
}
