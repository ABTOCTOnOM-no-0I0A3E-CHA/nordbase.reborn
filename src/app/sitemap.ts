import type { MetadataRoute } from 'next';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { houseMedia, houses, media, pages, seasons, tours } from '@/db/schema';
import { siteUrl } from '@/lib/site-url';
import { mediaUrl } from '@/lib/media-url';

/* Карта сайта строится из БД на каждый запрос — иначе новые страницы
   владельца не попадут в неё до следующей сборки.

   Вместе с адресами отдаём картинки: Яндекс.Картинки по запросам вроде
   «Рыбачий домики» приводят на турбазы заметную долю переходов, а сам робот
   находит далеко не всё, что лежит в галереях. */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pageRows, houseRows, tourRows, seasonRows] = await Promise.all([
    db
      .select({ slug: pages.slug, updatedAt: pages.updatedAt })
      .from(pages)
      .where(eq(pages.status, 'published')),
    db
      .select({ id: houses.id, slug: houses.slug, coverId: houses.coverId })
      .from(houses)
      .where(eq(houses.status, 'published')),
    db
      .select({ slug: tours.slug, coverId: tours.coverId })
      .from(tours)
      .where(eq(tours.status, 'published')),
    db
      .select({ slug: seasons.slug, coverId: seasons.coverId })
      .from(seasons)
      .where(eq(seasons.status, 'published')),
  ]);

  /* Обложки и галереи домиков — одним запросом на всё, а не по одному на
     страницу: карта сайта дёргается роботами часто. */
  const coverIds = [...houseRows, ...tourRows, ...seasonRows]
    .map((row) => row.coverId)
    .filter((id): id is string => id !== null);

  const [coverRows, galleryRows] = await Promise.all([
    coverIds.length > 0
      ? db.select({ id: media.id, key: media.key }).from(media).where(inArray(media.id, coverIds))
      : [],
    houseRows.length > 0
      ? db
          .select({ houseId: houseMedia.houseId, key: media.key })
          .from(houseMedia)
          .innerJoin(media, eq(houseMedia.mediaId, media.id))
          .where(
            inArray(
              houseMedia.houseId,
              houseRows.map((house) => house.id),
            ),
          )
      : [],
  ]);

  const coverById = new Map(coverRows.map((row) => [row.id, row.key]));
  const absolute = (key: string) => `${siteUrl()}${mediaUrl(key)}`;

  function houseImages(house: { id: string; coverId: string | null }): string[] {
    const keys = new Set<string>();
    const cover = house.coverId ? coverById.get(house.coverId) : undefined;
    if (cover) keys.add(cover);
    for (const row of galleryRows) if (row.houseId === house.id) keys.add(row.key);
    return [...keys].map(absolute);
  }

  function coverImage(row: { coverId: string | null }): string[] {
    const key = row.coverId ? coverById.get(row.coverId) : undefined;
    return key ? [absolute(key)] : [];
  }

  return [
    ...pageRows.map((page) => ({
      url: `${siteUrl()}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: (page.slug === '' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
      priority: page.slug === '' ? 1 : 0.7,
    })),
    ...houseRows.map((house) => ({
      url: `${siteUrl()}/rybachiy/doma/${house.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      images: houseImages(house),
    })),
    ...tourRows.map((tour) => ({
      url: `${siteUrl()}/rybachiy/tury/${tour.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      images: coverImage(tour),
    })),
    ...seasonRows.map((season) => ({
      url: `${siteUrl()}/teriberka/${season.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      images: coverImage(season),
    })),
  ];
}
