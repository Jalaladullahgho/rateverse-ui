import { Pool, PoolConfig } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __rv_pool__: Pool | undefined;
}

function makeConfig(): PoolConfig {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("Missing DATABASE_URL");

  // نحذف sslmode من الـURL حتى لا يفرض تحقق الشهادة
  let cleaned = raw;
  try {
    const u = new URL(raw);
    if (u.searchParams.has("sslmode")) u.searchParams.delete("sslmode");
    cleaned = u.toString();
  } catch { /* ignore parse issues */ }

  return {
    connectionString: cleaned,
    // تعطيل التحقق من الشهادة لتجاوز "self-signed certificate in certificate chain"
    ssl: { rejectUnauthorized: false },
    max: parseInt(process.env.PGPOOL_MAX || "5", 10),
    idleTimeoutMillis: 30000,
  };
}

/** Lazy singleton Pool */
export function getPool(): Pool {
  if (!globalThis.__rv_pool__) {
    // لمساعدة بعض البيئات: لا تتحقق من الشهادة
    if (!process.env.PGSSLMODE) process.env.PGSSLMODE = "no-verify";
    globalThis.__rv_pool__ = new Pool(makeConfig());
  }
  return globalThis.__rv_pool__!;
}

/** واجهة توافقية: pool.query(...) مع تهيئة كسولة */
export const pool = new Proxy({} as unknown as Pool, {
  get(_t, prop) {
    const p: any = (getPool() as any)[prop];
    return typeof p === "function" ? p.bind(getPool()) : p;
  },
});
