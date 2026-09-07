'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { media } from '@/db/schema';
import { requireUser } from '@/lib/auth/guard';
import { processImage } from '@/lib/images';
import { buildKey, put, remove } from '@/lib/storage';

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];

export type UploadState = { uploaded: number; errors: string[] };

/* Загрузка одного файла с возвратом самой записи. Нужна там, где фотографию
   выбирают: владелец открыл блок, увидел, что нужного снимка нет, и грузит его
   не выходя из редактора — уход в медиатеку означал бы потерю несохранённых
   правок блока. */
export type UploadedMedia = { id: string; key: string; alt: string };

export async function uploadOne(
  formData: FormData,
): Promise<{ media?: UploadedMedia; error?: string }> {
  await requireUser();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Файл не выбран' };
  if (file.size > MAX_BYTES) return { error: 'Файл больше 20 МБ' };
  if (file.type && !ALLOWED.includes(file.type)) return { error: 'Неподдерживаемый формат' };

  const alt = String(formData.get('alt') ?? '').trim();

  try {
    const processed = await processImage(Buffer.from(await file.arrayBuffer()));
    const key = buildKey(processed.extension);
    await put(key, processed.body);

    const [row] = await db
      .insert(media)
      .values({
        key,
        mime: processed.mime,
        width: processed.width,
        height: processed.height,
        size: processed.size,
        alt,
        blurhash: processed.placeholder,
      })
      .returning({ id: media.id, key: media.key, alt: media.alt });

    if (!row) return { error: 'Не удалось сохранить файл' };

    revalidatePath('/admin/media');
    revalidatePath('/', 'layout');
    return { media: row };
  } catch (cause) {
    /* Причину пишем в журнал: владельцу она не нужна, а без неё разбираться,
       почему конкретный файл не берётся, невозможно. */
    console.error('Загрузка не удалась:', file.name, cause);
    return { error: 'Не удалось обработать изображение' };
  }
}

export async function uploadMedia(_prev: UploadState, formData: FormData): Promise<UploadState> {
  await requireUser();

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  const alt = String(formData.get('alt') ?? '').trim();

  const errors: string[] = [];
  let uploaded = 0;

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      errors.push(`${file.name}: больше 20 МБ`);
      continue;
    }
    /* Тип из браузера не доверяем, но как быстрый отсев он полезен — настоящую
       проверку делает sharp, который просто не прочитает не-изображение. */
    if (file.type && !ALLOWED.includes(file.type)) {
      errors.push(`${file.name}: неподдерживаемый формат`);
      continue;
    }

    try {
      const processed = await processImage(Buffer.from(await file.arrayBuffer()));
      const key = buildKey(processed.extension);
      await put(key, processed.body);

      await db.insert(media).values({
        key,
        mime: processed.mime,
        width: processed.width,
        height: processed.height,
        size: processed.size,
        /* Пустой alt лучше, чем имя файла вида IMG_2481 — владелец допишет сам. */
        alt: alt || '',
        blurhash: processed.placeholder,
      });
      uploaded += 1;
    } catch {
      errors.push(`${file.name}: не удалось обработать`);
    }
  }

  revalidatePath('/admin/media');
  revalidatePath('/', 'layout');
  return { uploaded, errors };
}

export async function updateAlt(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));
  const alt = z.string().trim().max(300).parse(formData.get('alt') ?? '');
  await db.update(media).set({ alt }).where(eq(media.id, id));
  revalidatePath('/admin/media');
  revalidatePath('/', 'layout');
}

export async function deleteMedia(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));

  const rows = await db.select({ key: media.key }).from(media).where(eq(media.id, id)).limit(1);
  /* Сначала строка в БД, потом файл: если упадём между шагами, останется
     осиротевший файл на диске, а не битая ссылка на странице. */
  await db.delete(media).where(eq(media.id, id));
  if (rows[0]) await remove(rows[0].key);

  revalidatePath('/admin/media');
  revalidatePath('/', 'layout');
}
