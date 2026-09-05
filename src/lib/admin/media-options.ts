import 'server-only';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { media } from '@/db/schema';
import type { MediaOption } from '@/components/admin/MediaPicker';

/* Список для выбора фото. Отдаём только то, что нужно превью, — тащить
   в клиентский бандл blurhash и размеры всей медиатеки незачем. */
export function loadMediaOptions(): Promise<MediaOption[]> {
  return db
    .select({ id: media.id, key: media.key, alt: media.alt })
    .from(media)
    .orderBy(desc(media.createdAt));
}
