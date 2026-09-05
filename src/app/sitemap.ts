import type { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { houses, pages, seasons, tours } from '@/db/schema';
import { siteUrl } from '@/lib/site-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pageRows, houseRows, tourRows, seasonRows] = await Promise.all([
    db
      .select({ slug: pages.slug, updatedAt: pages.updatedAt })
      .from(pages)
      .where(eq(pages.status, 'published')),
    db.select({ slug: houses.slug }).from(houses).where(eq(houses.status, 'published')),
    db.select({ slug: tours.slug }).from(tours).where(eq(tours.status, 'published')),
    db.select({ slug: seasons.slug }).from(seasons).where(eq(seasons.status, 'published')),
  ]);

  return [
    ...pageRows.map((p) => ({
      url: `${siteUrl()}/${p.slug}`,
      lastModified: p.updatedAt,
      priority: p.slug === '' ? 1 : 0.7,
    })),
    ...houseRows.map((h) => ({ url: `${siteUrl()}/rybachiy/doma/${h.slug}`, priority: 0.6 })),
    ...tourRows.map((t) => ({ url: `${siteUrl()}/rybachiy/tury/${t.slug}`, priority: 0.8 })),
    ...seasonRows.map((s) => ({ url: `${siteUrl()}/teriberka/${s.slug}`, priority: 0.6 })),
  ];
}
