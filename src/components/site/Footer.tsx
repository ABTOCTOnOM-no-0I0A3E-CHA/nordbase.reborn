import Link from 'next/link';
import type { SiteSettings } from '@/lib/site-data';
import { safeHref } from '@/lib/safe-href';

export function Footer({ settings }: { settings: SiteSettings }) {
  const links = [
    { label: 'Telegram', href: safeHref(settings.telegram) },
    { label: 'WhatsApp', href: safeHref(settings.whatsapp) },
    { label: 'ВКонтакте', href: safeHref(settings.vk) },
  ].filter((link): link is { label: string; href: string } => link.href !== null);

  return (
    <footer className="border-line border-t">
      <div className="text-ink-3 mx-auto flex max-w-[1200px] flex-wrap justify-between gap-4 px-5 py-8 text-[13px] sm:px-[30px]">
        <span>
          © {new Date().getFullYear()} База отдыха «Север» · {settings.address}
        </span>
        <span className="flex flex-wrap gap-4">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink"
            >
              {link.label}
            </a>
          ))}
          <Link href="/policy" className="hover:text-ink">
            Обработка данных
          </Link>
        </span>
      </div>
    </footer>
  );
}
