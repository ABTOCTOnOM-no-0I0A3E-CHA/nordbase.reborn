import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { pages } from '@/db/schema';
import { AdminHeading, LinkButton } from '@/components/admin/ui';
import { Icon } from '@/components/admin/icons';

export const metadata = { title: 'Страницы' };

export default async function PagesList() {
  const rows = await db
    .select({
      id: pages.id,
      slug: pages.slug,
      title: pages.title,
      status: pages.status,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .orderBy(asc(pages.slug));

  return (
    <div>
      <AdminHeading
        title="Страницы"
        description="Каждая страница собирается из блоков: обложка, текст, фотографии, форма заявки. Порядок и состав вы задаёте сами."
        action={<LinkButton href="/admin/pages/new">Создать страницу</LinkButton>}
      />

      <div className="grid gap-2">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/admin/pages/${row.id}`}
            className="bg-bg-3 border-line hover:border-line-2 flex flex-wrap items-center gap-3 rounded-[14px] border px-4 py-3 transition"
          >
            <span className="bg-bg-2 text-ink-3 flex size-9 flex-none items-center justify-center rounded-[10px]">
              <Icon name="pages" className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[15px] font-semibold">{row.title}</b>
              <span className="text-ink-3 block truncate text-[12.5px]">
                nordbase.ru/{row.slug} · изменена {row.updatedAt.toLocaleDateString('ru-RU')}
              </span>
            </span>
            <span
              className={`flex-none rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                row.status === 'published' ? 'bg-ok/15 text-ok' : 'bg-amber/15 text-amber'
              }`}
            >
              {row.status === 'published' ? 'на сайте' : 'черновик'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
