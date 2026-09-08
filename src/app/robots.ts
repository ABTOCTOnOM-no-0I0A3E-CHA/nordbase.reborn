import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';
import { env } from '@/env';

/* Как и карта сайта — на каждый запрос. Иначе адрес вмерзает в образ на этапе
   сборки, где SITE_URL ещё подставной, и robots.txt на боевом домене уводит
   поисковик на localhost. */
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  /* Карту сайта на закрытом стенде тоже не отдаём: она приглашает робота
     обойти всё, что мы только что запретили. */
  if (env.SITE_NOINDEX) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
