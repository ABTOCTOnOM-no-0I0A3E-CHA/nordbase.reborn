/* Абсолютный адрес сайта нужен sitemap, robots и разметке JSON-LD.
   На проде задаётся через SITE_URL, локально — localhost. */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}
