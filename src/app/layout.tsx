import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'База отдыха «Север» — Рыбачий и Териберка', template: '%s — Nordbase' },
  description:
    'Своя база на полуострове Рыбачий и авторские туры по Териберке. Заброска на вездеходе, пропуск в погранзону оформляем сами.',
};

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
