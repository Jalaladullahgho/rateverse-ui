
export async function listOwnerContests(){
  const r = await fetch(`/api/owner/contests`, { credentials: 'include' });
  return await r.json();
}
export async function createContest(payload:any){
  const r = await fetch(`/api/owner/contests`, { method:'POST', headers: { 'Content-Type':'application/json' }, credentials:'include', body: JSON.stringify(payload) });
  return await r.json();
}
export async function listPublicContests(){
  const r = await fetch(`/api/contests`, { credentials: 'include' });
  return await r.json();
}
export async function getContest(slug:string){
  const r = await fetch(`/api/contests/` + slug, { credentials: 'include' });
  return await r.json();
}
export async function enterContest(id:string, body:any){
  const r = await fetch(`/api/contests/${id}/enter`, { method:'POST', headers: { 'Content-Type':'application/json' }, credentials:'include', body: JSON.stringify(body) });
  return await r.json();
}
export async function listWinners(id:string){
  const r = await fetch(`/api/contests/${id}/winners`, { credentials:'include' });
  return await r.json();
}
