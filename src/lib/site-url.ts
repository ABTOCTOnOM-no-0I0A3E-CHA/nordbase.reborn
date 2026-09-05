import { env } from '@/env';

/* Абсолютный адрес сайта нужен sitemap, robots и разметке JSON-LD.
   Значение проходит проверку в env.ts, здесь только убираем хвостовой слэш. */
export function siteUrl(): string {
  return env.SITE_URL.replace(/\/$/, '');
}
