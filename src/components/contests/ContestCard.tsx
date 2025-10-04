export default function ContestCard({ c }: {c:any}){
  return (
    <a href={`/contest/${c.slug}`} className="block border rounded p-4 hover:shadow">
      <div className="font-semibold">{c.title}</div>
      <div className="text-sm text-gray-500">{c.type} • {c.status}</div>
    </a>
  );
}