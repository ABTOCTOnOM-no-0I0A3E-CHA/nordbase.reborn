import { loadEnvFile } from 'node:process';
import type { Config } from 'drizzle-kit';

/* drizzle-kit запускается вне Next, поэтому .env подтягиваем сами.
   loadEnvFile — штатный Node 22, отдельная зависимость не нужна. */
try {
  loadEnvFile('.env');
} catch {
  /* .env может отсутствовать в CI — там переменные приходят из окружения */
}

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
} satisfies Config;
