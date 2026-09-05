import Link from 'next/link';
import { asc, desc, eq, gte, ne, sql, and } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, houses, media, pages, requests } from '@/db/schema';
import { AdminHeading, Panel } from '@/components/admin/ui';

export const metadata = { title: 'Панель' };

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

export default async function Dashboard() {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [counts, latest, upcoming, gaps] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        fresh: sql<number>`count(*) filter (where ${requests.status} = 'new')::int`,
        working: sql<number>`count(*) filter (where ${requests.status} = 'in_work')::int`,
      })
      .from(requests),

    db
      .select({
        id: requests.id,
        name: requests.name,
        phone: requests.phone,
        status: requests.status,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .orderBy(desc(requests.createdAt))
      .limit(5),

    db
      .select({
        id: bookings.id,
        dateFrom: bookings.dateFrom,
        dateTo: bookings.dateTo,
        note: bookings.note,
        houseTitle: houses.title,
      })
      .from(bookings)
      .innerJoin(houses, eq(bookings.houseId, houses.id))
      .where(and(gte(bookings.dateTo, todayIso), ne(bookings.status, 'cancelled')))
      .orderBy(asc(bookings.dateFrom))
      .limit(5),

    /* Подсказки о дырах в контенте: владельцу полезнее увидеть их здесь,
       чем однажды обнаружить пустую карточку на сайте. */
    Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(houses)
        .where(eq(houses.status, 'draft')),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(pages)
        .where(eq(pages.status, 'draft')),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(media)
        .where(eq(media.alt, '')),
    ]),
  ]);

  const [draftHouses, draftPages, noAlt] = gaps;

  const tiles = [
    { label: 'Новых заявок', value: counts[0]?.fresh ?? 0, accent: 'text-ice' },
    { label: 'В работе', value: counts[0]?.working ?? 0, accent: 'text-amber' },
    { label: 'Всего заявок', value: counts[0]?.total ?? 0, accent: 'text-ink' },
  ];

  const hints = [
    draftHouses[0]?.n
      ? { text: `Домиков в черновиках: ${draftHouses[0].n}`, href: '/admin/houses' }
      : null,
    draftPages[0]?.n
      ? { text: `Страниц в черновиках: ${draftPages[0].n}`, href: '/admin/pages' }
      : null,
    noAlt[0]?.n ? { text: `Фото без описания: ${noAlt[0].n}`, href: '/admin/media' } : null,
  ].filter((hint): hint is { text: string; href: string } => hint !== null);

  return (
    <div className="max-w-4xl">
      <AdminHeading title="Панель" description="Что происходит прямо сейчас." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Panel key={tile.label}>
            <p className="text-ink-3 mb-1 text-[13px]">{tile.label}</p>
            <p className={`text-3xl font-bold ${tile.accent}`}>{tile.value}</p>
          </Panel>
        ))}
      </div>

      {hints.length > 0 ? (
        <Panel className="mb-6">
          <p className="text-ink-3 mb-2 text-[12px] font-semibold tracking-[0.08em] uppercase">
            Стоит доделать
          </p>
          <ul className="grid gap-1">
            {hints.map((hint) => (
              <li key={hint.href}>
                <Link href={hint.href} className="text-ink-2 hover:text-aurora text-[14px]">
                  {hint.text} →
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">Последние заявки</h2>
            <Link href="/admin/requests" className="text-ink-3 hover:text-ink text-[13px]">
              все →
            </Link>
          </div>
          {latest.length === 0 ? (
            <p className="text-ink-3 text-[13.5px]">Заявок пока нет.</p>
          ) : (
            <ul className="grid gap-2">
              {latest.map((row) => (
                <li key={row.id} className="border-line flex items-center gap-3 border-b pb-2 last:border-b-0">
                  <b className="text-[14px]">{row.name}</b>
                  <span className="text-ink-3 text-[13px]">{row.phone}</span>
                  <span className="text-ink-3 ml-auto text-[12px]">
                    {row.createdAt.toLocaleDateString('ru-RU')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">Ближайшие заезды</h2>
            <Link href="/admin/calendar" className="text-ink-3 hover:text-ink text-[13px]">
              календарь →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-ink-3 text-[13.5px]">Броней нет.</p>
          ) : (
            <ul className="grid gap-2">
              {upcoming.map((row) => (
                <li key={row.id} className="border-line flex flex-wrap items-center gap-2 border-b pb-2 last:border-b-0">
                  <b className="text-[14px]">{row.houseTitle}</b>
                  <span className="text-ink-2 text-[13px]">
                    {formatDate(row.dateFrom)} — {formatDate(row.dateTo)}
                  </span>
                  {row.note ? <span className="text-ink-3 text-[12.5px]">{row.note}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
