'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SiteSettings } from '@/lib/site-data';
import { safeHref } from '@/lib/safe-href';

export function Header({
  menu: rawMenu,
  brandName,
  ctaLabel,
}: {
  menu: SiteSettings['menu'];
  brandName: string;
  ctaLabel: string;
}) {
  /* Пункты вводит владелец; ссылку с неожиданной схемой просто не показываем. */
  const menu = rawMenu.flatMap((item) => {
    const href = safeHref(item.href);
    return href ? [{ label: item.label, href }] : [];
  });

  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition ${
        solid ? 'bg-bg/90 border-line backdrop-blur-[12px]' : 'border-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:gap-5 sm:px-[30px] sm:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="from-aurora via-ice to-violet size-[26px] flex-none rounded-full bg-conic" />
          <span className="font-display truncate text-[15px] font-semibold tracking-[-0.01em] sm:text-[16px]">
            {brandName}
          </span>
        </Link>

        <ul className="hidden gap-6 text-[14.5px] lg:flex">
          {menu.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-ink-2 hover:text-ink">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex flex-none items-center gap-2 sm:gap-3">
          {/* Надпись задаёт владелец, длину не угадать: на телефоне кнопка
              держится в одну строку и ужимается, а не разъезжается на две. */}
          <Link
            href="/#request"
            className="bg-aurora text-aurora-ink hover:bg-aurora-hi rounded-full px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap sm:px-5 sm:py-2.5 sm:text-[14.5px]"
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            aria-label="Меню"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="border-line-2 text-ink flex size-10 cursor-pointer items-center justify-center rounded-full border lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open ? (
        <ul className="bg-bg border-line grid border-t px-4 py-2 lg:hidden">
          {menu.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-ink-2 hover:text-ink border-line block border-b py-3.5 text-[15px] last:border-b-0"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
