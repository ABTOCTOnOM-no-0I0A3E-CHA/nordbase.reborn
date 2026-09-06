'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Mark } from '@/components/Mark';

/* Каркас панели. На широком экране — колонка слева, как было. На телефоне
   тринадцать разделов над содержимым означали бы, что до самой страницы надо
   пролистать целый экран меню, поэтому там меню уезжает в выдвижную панель,
   а сверху остаётся полоска с кнопкой и счётчиком новых заявок. */

export function AdminShell({
  sidebar,
  children,
  newRequests,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  newRequests: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  /* С ширины ноутбука меню — обычная колонка и никуда не ездит. Считаем это в
     JS, потому что положение задаётся инлайн-стилем, а он медиа-запросов не
     знает. До гидрации работает правило .admin-drawer из globals.css. */
  const [phone, setPhone] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const sync = () => setPhone(!query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  /* Перешли в раздел — панель закрывается сама. */
  useEffect(() => setOpen(false), [pathname]);

  /* Пока меню открыто, страница под ним не должна прокручиваться: иначе палец
     листает содержимое, а не список разделов. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[254px_1fr]">
      <header className="border-line bg-bg-0/95 sticky top-0 z-30 flex items-center gap-3 border-b px-3 py-2.5 backdrop-blur-[10px] lg:hidden">
        <button
          type="button"
          aria-label="Разделы"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="border-line-2 text-ink flex size-11 flex-none cursor-pointer items-center justify-center rounded-[12px] border"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <span className="flex items-center gap-2">
          <Mark id="nb-bar" className="size-[22px] flex-none" />
          <span className="font-display text-[14px] font-semibold">NORDBASE</span>
        </span>

        {newRequests > 0 ? (
          <a
            href="/admin/requests"
            className="bg-ice text-bg ml-auto rounded-full px-3 py-1.5 text-[12px] font-bold"
          >
            {newRequests} новых
          </a>
        ) : null}
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      ) : null}

      {/* Сдвиг задан правилом .admin-drawer в globals.css, а не утилитами:
          с ними состояние «открыто» зависело бы от того, попал ли нужный класс
          в сборку, и панель молча оставалась бы за экраном. */}
      <aside
        /* Пока ширина неизвестна (сервер и первый кадр) положение задаёт CSS:
           иначе на ноутбуке панель успевала бы уехать и въехать обратно. */
        style={{
          transform: phone ? (open ? 'translateX(0)' : 'translateX(-100%)') : undefined,
        }}
        className="admin-drawer bg-bg-0 border-line fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col overflow-y-auto border-r px-3 py-5 lg:sticky lg:inset-y-auto lg:top-0 lg:left-auto lg:z-auto lg:h-dvh lg:w-auto"
      >
        <div className="mb-4 flex items-center justify-end lg:hidden">
          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => setOpen(false)}
            className="text-ink-3 hover:text-ink flex size-9 cursor-pointer items-center justify-center rounded-full"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {sidebar}
      </aside>

      <main className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
