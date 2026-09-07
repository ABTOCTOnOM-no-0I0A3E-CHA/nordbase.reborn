import 'server-only';
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { media } from '@/db/schema';
import { mediaUrl } from './media-url';
import { loadSettings } from './site-data';

/* Метаданные страницы собираются в одном месте: раньше страницы отдавали
   только заголовок с описанием, и ссылка на домик, брошенная в Telegram,
   выглядела голой строкой без картинки.

   Абсолютные адреса тут не нужны — metadataBase в корневом layout
   разворачивает и canonical, и og:url, и путь к картинке. */

/* Картинка сайта по умолчанию: та, что выбрана в настройках, иначе файл из
   public. Одинаковая для всех страниц без своей обложки. */
async function defaultImage(): Promise<string> {
  const settings = await loadSettings();
  const key = await mediaKey(settings.ogMediaId || null);
  return key ? mediaUrl(key) : '/og-default.jpg';
}

export async function mediaKey(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const rows = await db.select({ key: media.key }).from(media).where(eq(media.id, id)).limit(1);
  return rows[0]?.key ?? null;
}

export async function pageMetadata({
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
}): Promise<Metadata> {
  /* Запасную картинку подставляем явно. Next не подмешивает images из
     корневого layout: страница, объявившая свой openGraph, заменяет его
     целиком — и без этой строки все страницы без своей обложки уходили бы
     в мессенджеры голыми. */
  const image = imageKey ? mediaUrl(imageKey) : await defaultImage();

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
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || undefined,
      images: [image],
    },
  };
}
