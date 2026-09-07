import type { Metadata } from 'next';

/* Панель не должна попадать в поиск. robots.txt — это просьба, которую робот
   вправе проигнорировать, а мета-запрет действует и на уже найденные адреса:
   ссылку на вход могут проставить откуда угодно. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  /* Панель ставится на главный экран телефона как приложение — иначе iPhone
     не отдаёт ей push-уведомления вовсе. */
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Север', statusBarStyle: 'black-translucent' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
