import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

/* Как и карта сайта — на каждый запрос. Иначе адрес вмерзает в образ на этапе
   сборки, где SITE_URL ещё подставной, и robots.txt на боевом домене уводит
   поисковик на localhost. */
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
