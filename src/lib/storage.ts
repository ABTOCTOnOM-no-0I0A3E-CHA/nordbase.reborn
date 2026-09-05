/* Модуль серверный: node:fs. Его же использует scripts/seed.ts, поэтому
   без server-only — тот пакет бросает исключение вне рантайма RSC. */
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mediaUrl } from './media-url';

/* Файлы лежат на диске рядом с приложением: public/uploads/ГГГГ/ММ/<uuid>.<ext>.
   На VPS это примонтированный том, next/image сам делает производные размеры.
   Когда появится объектное хранилище — меняется только реализация этих трёх функций,
   вызывающий код и таблица media остаются как есть (в БД лежит key, не URL). */

const ROOT = join(process.cwd(), 'public', 'uploads');

export function buildKey(extension: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}/${month}/${randomUUID()}.${extension}`;
}

export async function put(key: string, body: Buffer): Promise<void> {
  const target = join(ROOT, key);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, body);
}

export async function remove(key: string): Promise<void> {
  try {
    await unlink(join(ROOT, key));
  } catch {
    /* файла уже нет — для удаления это успех */
  }
}

export { mediaUrl as publicUrl };
