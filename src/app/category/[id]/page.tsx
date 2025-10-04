import { pool } from "@/lib/db";

export default async function CategoryPage({ params }: { params: { id: string } }){
  const { rows } = await pool.query(`SELECT name_en FROM public.categories WHERE id=$1`, [params.id]);
  const name = rows[0]?.name_en || "Category";
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{name}</h1>
      <div className="card">Services list for this category — coming soon.</div>
    </div>
  );
}
