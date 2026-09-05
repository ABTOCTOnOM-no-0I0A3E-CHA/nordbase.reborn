import type { Metadata } from 'next';
import { Golos_Text, Unbounded } from 'next/font/google';
import './globals.css';

const golos = Golos_Text({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-golos',
  display: 'swap',
});

const unbounded = Unbounded({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '600'],
  variable: '--font-unbounded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'База отдыха «Север» — Рыбачий и Териберка', template: '%s — Nordbase' },
  description:
    'Своя база на полуострове Рыбачий и авторские туры по Териберке. Заброска на вездеходе, пропуск в погранзону оформляем сами.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${golos.variable} ${unbounded.variable}`}>
      <body>{children}</body>
    </html>
  );
}
