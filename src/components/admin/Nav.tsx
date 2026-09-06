'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './icons';

/* Разделы сгруппированы по тому, как владелец о них думает: сначала то, что
   он открывает каждый день, потом наполнение сайта, потом редкие настройки.
   Иконки нужны не для красоты: список из двенадцати одинаковых строк
   приходится читать целиком, а по значку глаз находит нужное сразу. */

type Item = { href: string; label: string; icon: IconName; hint?: string };

const groups: { title: string; items: Item[] }[] = [
  {
    title: 'Каждый день',
    items: [
      { href: '/admin', label: 'Главное', icon: 'dashboard' },
      { href: '/admin/requests', label: 'Заявки', icon: 'requests' },
      { href: '/admin/calendar', label: 'Занятость', icon: 'calendar' },
    ],
  },
  {
    title: 'Что на сайте',
    items: [
      { href: '/admin/pages', label: 'Страницы', icon: 'pages' },
      { href: '/admin/houses', label: 'Домики', icon: 'house' },
      { href: '/admin/tours', label: 'Туры', icon: 'tour' },
      { href: '/admin/seasons', label: 'Сезоны', icon: 'season' },
      { href: '/admin/media', label: 'Фотографии', icon: 'media' },
    ],
  },
  {
    title: 'Списки и настройки',
    items: [
      { href: '/admin/prices', label: 'Цены', icon: 'price' },
      { href: '/admin/faq', label: 'Вопросы', icon: 'faq' },
      { href: '/admin/reviews', label: 'Отзывы', icon: 'review' },
      { href: '/admin/settings', label: 'Настройки', icon: 'settings' },
      { href: '/admin/integrations', label: 'Уведомления', icon: 'plug' },
    ],
  },
];

export function Nav({ newRequests }: { newRequests: number }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-5">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="text-ink-3 mb-1.5 px-3 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
            {group.title}
          </p>
          <ul className="grid gap-px">
            {group.items.map((item) => {
              /* «Главное» подсвечиваем только на точном совпадении, иначе оно
                 будет активным на всех вложенных страницах админки. */
              const active =
                item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`relative flex items-center gap-2.5 rounded-[10px] py-2 pr-3 pl-3 text-[14px] transition ${
                      active
                        ? 'bg-bg-3 text-ink font-semibold'
                        : 'text-ink-2 hover:bg-bg-3/50 hover:text-ink'
                    }`}
                  >
                    {active ? (
                      <span className="bg-aurora absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r" />
                    ) : null}
                    <Icon name={item.icon} className={active ? 'text-aurora size-[18px]' : 'size-[18px]'} />
                    {item.label}
                    {/* Счётчик новых заявок — единственное, что требует внимания
                        прямо сейчас, поэтому он виден из любого раздела. */}
                    {item.href === '/admin/requests' && newRequests > 0 ? (
                      <span className="bg-ice/20 text-ice ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold">
                        {newRequests}
                      </span>
                    ) : null}
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
