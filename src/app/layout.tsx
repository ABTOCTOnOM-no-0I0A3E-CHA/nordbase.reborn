import type { Metadata } from 'next';
import './globals.css';
import { loadSettings } from '@/lib/site-data';
import { siteUrl } from '@/lib/site-url';
import { mediaUrl } from '@/lib/media-url';
import { mediaKey } from '@/lib/seo';
import { env } from '@/env';

/* Заголовок и описание по умолчанию правятся в админке, а не в коде. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();
  const url = siteUrl();

  /* Картинка для мессенджеров: ссылку на базу кидают в Telegram, WhatsApp и
     VK чаще, чем открывают из поиска, а без неё там остаётся голая строка.
     Своя картинка страницы перебивает эту в generateMetadata самой страницы. */
  const key = await mediaKey(settings.ogMediaId || null);
  const preview = key ? mediaUrl(key) : '/og-default.jpg';

  return {
    /* Без metadataBase Next оставляет canonical и og:url относительными, а для
       поисковика это не адрес. */
    metadataBase: new URL(url),
    title: { default: settings.seoTitle, template: `%s — ${settings.brandName}` },
    description: settings.seoDescription,
    applicationName: settings.legalName,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'ru_RU',
      siteName: settings.legalName,
      title: settings.seoTitle,
      description: settings.seoDescription,
      url,
      images: [{ url: preview, width: 1200, height: 630, alt: settings.legalName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.seoTitle,
      description: settings.seoDescription,
      images: [preview],
    },
    /* Коды подтверждения прав вставляет владелец в настройках сайта. */
    verification: {
      yandex: settings.yandexVerification || undefined,
      google: settings.googleVerification || undefined,
    },
    /* robots.txt — просьба, которую робот вправе не выполнить; мета-запрет
       действует и на адреса, найденные по ссылкам со стороны. */
    robots: env.SITE_NOINDEX
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
        },
  };
}

export const viewport = { themeColor: '#07131b' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Кириллические начертания нужны на первом экране любой страницы —
            просим браузер начать их качать сразу, не дожидаясь разбора CSS. */}
        <link
          rel="preload"
          href="/fonts/golos-text-cyrillic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/unbounded-cyrillic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
