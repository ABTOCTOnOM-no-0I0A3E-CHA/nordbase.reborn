import type { Metadata } from 'next';
import './globals.css';
import { loadSettings } from '@/lib/site-data';

/* Заголовок и описание по умолчанию правятся в админке, а не в коде. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();
  return {
    title: { default: settings.seoTitle, template: `%s — ${settings.brandName}` },
    description: settings.seoDescription,
  };
}

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
