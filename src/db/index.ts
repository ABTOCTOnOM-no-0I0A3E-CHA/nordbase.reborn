import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/env';
import * as schema from './schema';

/* В dev Next перезагружает модули на каждом изменении — без кеша на globalThis
   пул соединений течёт и Postgres упирается в max_connections. */
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool = globalForDb.pool ?? new Pool({ connectionString: env.DATABASE_URL, max: 10 });

if (env.NODE_ENV !== 'production') globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
