import Link from 'next/link';
import type { SiteSettings } from '@/lib/site-data';

export function Footer({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="border-line border-t">
      <div className="text-ink-3 mx-auto flex max-w-[1200px] flex-wrap justify-between gap-4 px-5 py-8 text-[13px] sm:px-[30px]">
        <span>
          © {new Date().getFullYear()} База отдыха «Север» · {settings.address}
        </span>
        <span className="flex flex-wrap gap-4">
          <a href={settings.telegram} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            Telegram
          </a>
          <a href={settings.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            WhatsApp
          </a>
          <a href={settings.vk} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            ВКонтакте
          </a>
          <Link href="/policy" className="hover:text-ink">
            Обработка данных
          </Link>
        </span>
      </div>
    </footer>
  );
}
