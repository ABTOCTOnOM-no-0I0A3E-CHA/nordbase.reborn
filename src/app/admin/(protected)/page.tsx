import Link from 'next/link';
import { and, asc, desc, eq, gt, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, houses, media, pages, requests } from '@/db/schema';
import { AdminHeading, EmptyState, LinkButton, Panel } from '@/components/admin/ui';
import { Icon, type IconName } from '@/components/admin/icons';
import { todayIso } from '@/lib/dates';

export const metadata = { title: 'Главное' };

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

/* Быстрые переходы: владелец заходит в админку с конкретным намерением —
   «поменять цену», «добавить фото». Пусть это будет в один клик с главной,
   а не поиском по списку разделов. */
const shortcuts: { href: string; label: string; icon: IconName }[] = [
  { href: '/admin/prices', label: 'Поменять цены', icon: 'price' },
  { href: '/admin/media', label: 'Загрузить фото', icon: 'media' },
  { href: '/admin/houses', label: 'Править домики', icon: 'house' },
  { href: '/admin/calendar', label: 'Отметить занятость', icon: 'calendar' },
];

export default async function Dashboard() {
  const today = todayIso();

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
      .where(and(gt(bookings.dateTo, today), ne(bookings.status, 'cancelled')))
      .orderBy(asc(bookings.dateFrom))
      .limit(5),

    /* Подсказки о дырах в контенте: владельцу полезнее увидеть их здесь,
       чем однажды обнаружить пустую карточку на сайте. */
    Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(houses).where(eq(houses.status, 'draft')),
      db.select({ n: sql<number>`count(*)::int` }).from(pages).where(eq(pages.status, 'draft')),
      db.select({ n: sql<number>`count(*)::int` }).from(media).where(eq(media.alt, '')),
    ]),
  ]);

  const [draftHouses, draftPages, noAlt] = gaps;
  const fresh = counts[0]?.fresh ?? 0;

  const hints = [
    draftHouses[0]?.n
      ? {
          text: `Домиков спрятано от гостей: ${draftHouses[0].n}`,
          why: 'Черновики на сайте не видны — опубликуйте, когда будут фото и описание.',
          href: '/admin/houses',
        }
      : null,
    draftPages[0]?.n
      ? {
          text: `Страниц в черновиках: ${draftPages[0].n}`,
          why: 'Пока страница в черновике, по её адресу гость увидит «страница не найдена».',
          href: '/admin/pages',
        }
      : null,
    noAlt[0]?.n
      ? {
          text: `Фотографий без описания: ${noAlt[0].n}`,
          why: 'Описание помогает поиску находить ваши фото и читается вслух незрячим гостям.',
          href: '/admin/media',
        }
      : null,
  ].filter((hint): hint is { text: string; why: string; href: string } => hint !== null);

  return (
    <div>
      <AdminHeading
        title="Главное"
        description="Всё, что требует внимания прямо сейчас. Разделы слева — для остального."
      />

      {/* Заявки — единственное, что бывает срочным, поэтому им отдельная
          карточка во всю ширину, а не плитка в ряду одинаковых цифр. */}
      <Panel className="mb-5">
        {fresh > 0 ? (
          <div className="flex flex-wrap items-center gap-5">
            <span className="bg-ice/15 text-ice flex size-14 flex-none items-center justify-center rounded-full text-[22px] font-bold">
              {fresh}
            </span>
            <div className="flex-1">
              <b className="block text-[17px] font-bold">
                {fresh === 1 ? 'Новая заявка ждёт ответа' : `Новых заявок: ${fresh}`}
              </b>
              <p className="text-ink-2 mt-0.5 text-[13.5px]">
                Позвоните гостю и отметьте заявку как «в работе», чтобы не потерять.
              </p>
            </div>
            <LinkButton href="/admin/requests">Открыть заявки</LinkButton>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <span className="bg-ok/15 text-ok flex size-11 flex-none items-center justify-center rounded-full">
              <Icon name="requests" className="size-5" />
            </span>
            <div className="flex-1">
              <b className="block text-[15.5px] font-semibold">Новых заявок нет</b>
              <p className="text-ink-3 mt-0.5 text-[13px]">
                Всего заявок: {counts[0]?.total ?? 0} · в работе: {counts[0]?.working ?? 0}
              </p>
            </div>
            <Link href="/admin/requests" className="text-ink-2 hover:text-ink text-[13.5px]">
              Вся история →
            </Link>
          </div>
        )}
      </Panel>

      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-bg-3 border-line hover:border-line-2 hover:text-ink text-ink-2 flex items-center gap-3 rounded-[12px] border px-4 py-3.5 text-[14px] font-semibold transition"
          >
            <Icon name={item.icon} className="text-aurora size-[18px]" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Последние заявки">
          {latest.length === 0 ? (
            <p className="text-ink-3 text-[13.5px]">
              Заявок пока нет. Они появятся здесь сразу после отправки формы на сайте.
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {latest.map((row) => (
                <li
                  key={row.id}
                  className="border-line flex items-center gap-3 border-b pb-2.5 last:border-b-0 last:pb-0"
                >
                  <b className="text-[14px]">{row.name}</b>
                  <a href={`tel:${row.phone}`} className="text-ice text-[13px]">
                    {row.phone}
                  </a>
                  <span className="text-ink-3 ml-auto text-[12px]">
                    {row.createdAt.toLocaleDateString('ru-RU')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Ближайшие заезды" description="Заполняется вручную в разделе «Занятость».">
          {upcoming.length === 0 ? (
            <p className="text-ink-3 text-[13.5px]">
              Занятых дат нет. Отмечайте брони, и гости увидят на сайте, какие даты свободны.
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {upcoming.map((row) => (
                <li
                  key={row.id}
                  className="border-line flex flex-wrap items-center gap-2 border-b pb-2.5 last:border-b-0 last:pb-0"
                >
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

      {hints.length > 0 ? (
        <Panel
          className="mt-5"
          title="Стоит доделать"
          description="Не срочно, но гости этого не увидят, пока не поправите."
        >
          <ul className="grid gap-3">
            {hints.map((hint) => (
              <li key={hint.href}>
                <Link href={hint.href} className="group block">
                  <b className="text-ink group-hover:text-aurora block text-[14px] font-semibold transition">
                    {hint.text} →
                  </b>
                  <span className="text-ink-3 text-[13px]">{hint.why}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {latest.length === 0 && upcoming.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon="dashboard"
            title="Здесь пока пусто — и это нормально"
            description="Сайт уже работает. Как только гость оставит заявку, она появится на этом экране, а вы получите уведомление в Telegram."
            action={<LinkButton href="/" variant="ghost">Посмотреть сайт</LinkButton>}
          />
        </div>
      ) : null}
    </div>
  );
}
