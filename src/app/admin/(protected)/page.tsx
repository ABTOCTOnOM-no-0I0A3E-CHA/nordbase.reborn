import Link from 'next/link';
import { and, asc, desc, eq, gt, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, houses, requests } from '@/db/schema';
import { AdminHeading, EmptyState, LinkButton, Panel } from '@/components/admin/ui';
import { Icon, type IconName } from '@/components/admin/icons';
import { todayIso } from '@/lib/dates';

export const metadata = { title: 'Главное' };

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

/* Статус — отдельный цветной ярлык, а не слово вплотную к имени: иначе
   строка читается как «Ольга Новая», будто это фамилия гостя. */
const REQUEST_LABEL: Record<string, string> = {
  new: 'ждёт ответа',
  in_work: 'в работе',
  confirmed: 'подтверждена',
  cancelled: 'отменена',
};

const REQUEST_STYLE: Record<string, string> = {
  new: 'bg-ice text-bg uppercase tracking-[0.06em]',
  in_work: 'bg-amber text-bg',
  confirmed: 'bg-ok text-bg',
  cancelled: 'border-line-2 text-ink-3 border',
};

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

  const [counts, latest, upcoming] = await Promise.all([
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
        guests: bookings.guests,
        status: bookings.status,
        note: bookings.note,
        houseTitle: houses.title,
      })
      .from(bookings)
      .innerJoin(houses, eq(bookings.houseId, houses.id))
      .where(and(gt(bookings.dateTo, today), ne(bookings.status, 'cancelled')))
      .orderBy(asc(bookings.dateFrom))
      .limit(5),

  ]);

  const fresh = counts[0]?.fresh ?? 0;


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
            <ul className="grid gap-2">
              {latest.map((row) => {
                const isNew = row.status === 'new';
                return (
                  <li
                    key={row.id}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border px-3.5 py-2.5 ${
                      isNew ? 'border-ice bg-ice/15' : 'border-line bg-bg-2'
                    }`}
                  >
                    {isNew ? <span className="bg-ice size-2 flex-none rounded-full" /> : null}
                    <b className={isNew ? 'text-[15px]' : 'text-[14px]'}>{row.name}</b>
                    <a href={`tel:${row.phone}`} className="text-ice text-[13px]">
                      {row.phone}
                    </a>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        REQUEST_STYLE[row.status] ?? ''
                      }`}
                    >
                      {REQUEST_LABEL[row.status]}
                    </span>
                    <span className="text-ink-3 ml-auto text-[12px] tabular-nums">
                      {row.createdAt.toLocaleDateString('ru-RU')}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Ближайшие заезды" description="Заполняется вручную в разделе «Занятость».">
          {upcoming.length === 0 ? (
            <p className="text-ink-3 text-[13.5px]">
              Занятых дат нет. Отмечайте брони, и гости увидят на сайте, какие даты свободны.
            </p>
          ) : (
            <ul className="grid gap-2">
              {upcoming.map((row) => (
                <li
                  key={row.id}
                  className="border-line bg-bg-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border px-3.5 py-2.5"
                >
                  <span
                    className={`size-2 flex-none rounded-full ${
                      row.status === 'confirmed' ? 'bg-busy' : 'bg-amber'
                    }`}
                  />
                  <b className="text-[14px]">{row.houseTitle}</b>
                  <span className="text-ink-2 text-[13px] tabular-nums">
                    {formatDate(row.dateFrom)} — {formatDate(row.dateTo)}
                  </span>
                  {row.guests ? (
                    <span className="text-ink-3 text-[12.5px]">{row.guests} чел.</span>
                  ) : null}
                  {row.note ? <span className="text-ink-3 text-[12.5px]">{row.note}</span> : null}
                  {row.status === 'hold' ? (
                    <span className="bg-amber text-bg ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold">
                      ждёт подтверждения
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

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
