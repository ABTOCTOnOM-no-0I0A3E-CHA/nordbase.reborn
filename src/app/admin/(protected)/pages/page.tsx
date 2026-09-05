import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { pages } from '@/db/schema';
import { AdminHeading, LinkButton } from '@/components/admin/ui';

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
    <div className="max-w-4xl">
      <AdminHeading
        title="Страницы"
        description="Каждая страница собирается из блоков. Адрес — это путь на сайте: пустой означает главную."
        action={<LinkButton href="/admin/pages/new">Новая страница</LinkButton>}
      />

      <div className="grid gap-2">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/admin/pages/${row.id}`}
            className="bg-bg-3 border-line hover:border-line-2 flex flex-wrap items-center gap-3 rounded-[12px] border px-4 py-3 transition"
          >
            <b className="text-[15px] font-semibold">{row.title}</b>
            <code className="text-ink-3 text-[12.5px]">/{row.slug}</code>
            <span
              className={`ml-auto rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                row.status === 'published' ? 'bg-ok/15 text-ok' : 'bg-amber/15 text-amber'
              }`}
            >
              {row.status === 'published' ? 'опубликована' : 'черновик'}
            </span>
            <span className="text-ink-3 text-[12px]">
              {row.updatedAt.toLocaleDateString('ru-RU')}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
