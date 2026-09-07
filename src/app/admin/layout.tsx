import type { Metadata } from 'next';

/* Панель не должна попадать в поиск. robots.txt — это просьба, которую робот
   вправе проигнорировать, а мета-запрет действует и на уже найденные адреса:
   ссылку на вход могут проставить откуда угодно. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
