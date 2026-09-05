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
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-5 px-5 py-4 sm:px-[30px]">
        <Link href="/" className="flex items-center gap-3">
          <span className="from-aurora via-ice to-violet size-[26px] flex-none rounded-full bg-conic" />
          <span className="font-display text-[16px] font-semibold tracking-[-0.01em]">
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

        <div className="flex items-center gap-3">
          <Link
            href="/#request"
            className="bg-aurora text-aurora-ink hover:bg-aurora-hi rounded-full px-5 py-2.5 text-[14.5px] font-semibold"
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            aria-label="Меню"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="border-line-2 text-ink cursor-pointer rounded-full border px-3 py-2 lg:hidden"
          >
            ≡
          </button>
        </div>
      </nav>

      {open ? (
        <ul className="bg-bg border-line grid gap-1 border-t px-5 py-4 lg:hidden">
          {menu.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-ink-2 hover:text-ink block py-2"
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
