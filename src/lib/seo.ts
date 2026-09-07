import 'server-only';
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { media } from '@/db/schema';
import { mediaUrl } from './media-url';

/* Метаданные страницы собираются в одном месте: раньше страницы отдавали
   только заголовок с описанием, и ссылка на домик, брошенная в Telegram,
   выглядела голой строкой без картинки.

   Абсолютные адреса тут не нужны — metadataBase в корневом layout
   разворачивает и canonical, и og:url, и путь к картинке. */

export async function mediaKey(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const rows = await db.select({ key: media.key }).from(media).where(eq(media.id, id)).limit(1);
  return rows[0]?.key ?? null;
}

export function pageMetadata({
  title,
  description,
  path,
  imageKey,
  type = 'website',
}: {
  title: string;
  description?: string | null;
  /* Путь от корня, со слэшем: /rybachiy/doma/dom-1 */
  path: string;
  /* Ключ файла в медиатеке. Пусто — берётся картинка сайта по умолчанию. */
  imageKey?: string | null;
  type?: 'website' | 'article';
}): Metadata {
  const image = imageKey ? mediaUrl(imageKey) : undefined;

  return {
    title,
    description: description || undefined,
    alternates: { canonical: path },
    openGraph: {
      type,
      locale: 'ru_RU',
      title,
      description: description || undefined,
      url: path,
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || undefined,
      ...(image ? { images: [image] } : {}),
    },
  };
}
