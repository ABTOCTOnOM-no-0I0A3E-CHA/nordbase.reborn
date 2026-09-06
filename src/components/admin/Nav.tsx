'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const groups: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: 'Работа',
    items: [
      { href: '/admin', label: 'Панель' },
      { href: '/admin/requests', label: 'Заявки' },
      { href: '/admin/calendar', label: 'Занятость' },
    ],
  },
  {
    title: 'Контент',
    items: [
      { href: '/admin/pages', label: 'Страницы' },
      { href: '/admin/houses', label: 'Домики' },
      { href: '/admin/tours', label: 'Туры' },
      { href: '/admin/seasons', label: 'Сезоны' },
      { href: '/admin/media', label: 'Медиатека' },
    ],
  },
  {
    title: 'Справочники',
    items: [
      { href: '/admin/prices', label: 'Цены' },
      { href: '/admin/faq', label: 'Вопросы' },
      { href: '/admin/reviews', label: 'Отзывы' },
      { href: '/admin/settings', label: 'Настройки' },
      { href: '/admin/integrations', label: 'Интеграции' },
    ],
  },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="text-ink-3 mb-2 px-3 text-[11px] font-semibold tracking-[0.1em] uppercase">
            {group.title}
          </p>
          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              /* «Панель» подсвечиваем только на точном совпадении, иначе она
                 будет активной на всех вложенных страницах админки. */
              const active =
                item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-[9px] px-3 py-2 text-[14px] ${
                      active ? 'bg-bg-3 text-ink font-semibold' : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
