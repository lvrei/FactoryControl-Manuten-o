import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL not set. Server DB operations will be disabled.');
}

export function isDbConfigured(): boolean {
  return !!connectionString;
}

export const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : (null as unknown as pg.Pool);

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>{
  if (!pool) throw new Error('Database not configured');
  return pool.query(text, params);
}
