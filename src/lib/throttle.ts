import 'server-only';
import { headers } from 'next/headers';

/* Счётчик в памяти процесса. Приложение работает одним инстансом на VPS,
   поэтому этого достаточно; при переезде на несколько процессов сюда нужно
   подставить Redis, а вызывающий код не изменится. */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/* Чистим редко и лениво: отдельный таймер держал бы процесс живым без нужды. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export async function clientKey(scope: string): Promise<string> {
  const store = await headers();
  /* За Caddy настоящий адрес приходит в X-Forwarded-For; берём первый узел. */
  const forwarded = store.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || store.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}`;
}

/* true — можно продолжать, false — лимит исчерпан. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
