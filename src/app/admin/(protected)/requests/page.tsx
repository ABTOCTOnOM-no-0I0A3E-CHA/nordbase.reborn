import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { houses, requests, tours } from '@/db/schema';
import { AdminHeading, EmptyState, Panel, Select, Submit } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { Icon } from '@/components/admin/icons';
import { deleteRequest, setRequestStatus } from '@/lib/admin/request-actions';

export const metadata = { title: 'Заявки' };

const STATUS_LABEL: Record<string, string> = {
  new: 'новая',
  in_work: 'в работе',
  confirmed: 'подтверждена',
  cancelled: 'отменена',
};

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-ice text-bg',
  in_work: 'bg-amber/15 text-amber',
  confirmed: 'bg-ok/15 text-ok',
  cancelled: 'bg-busy/15 text-busy',
};

const STATUS_OPTIONS = [
  { value: 'new', label: 'новая' },
  { value: 'in_work', label: 'в работе' },
  { value: 'confirmed', label: 'подтверждена' },
  { value: 'cancelled', label: 'отменена' },
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

export default async function RequestsPage() {
  const rows = await db
    .select({
      request: requests,
      houseTitle: houses.title,
      tourTitle: tours.title,
    })
    .from(requests)
    .leftJoin(houses, eq(requests.houseId, houses.id))
    .leftJoin(tours, eq(requests.tourId, tours.id))
    /* Новые — наверх, дальше по свежести. Иначе неотвеченная заявка
       недельной давности тонет между обработанными. */
    .orderBy(asc(sql`case when ${requests.status} = 'new' then 0 else 1 end`), desc(requests.createdAt));

  const fresh = rows.filter((row) => row.request.status === 'new').length;

  return (
    <div>
      <AdminHeading
        title="Заявки"
        description="Приходят с сайта и дублируются в Telegram. Заявка ничего не бронирует: договорились с гостем — отметьте даты в разделе «Занятость»."
        action={
          rows.length > 0 ? (
            <a
              href="/admin/requests/export"
              className="border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink rounded-full border px-5 py-2.5 text-[14px] font-semibold transition"
            >
              Выгрузить в таблицу
            </a>
          ) : null
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="requests"
          title="Заявок пока нет"
          description="Как только гость отправит форму на сайте, заявка появится здесь — и придёт вам в Telegram."
        />
      ) : (
        <div className="grid gap-3">
          {fresh > 0 ? (
            <p className="text-ice mb-1 text-[13.5px] font-semibold">
              Ждут ответа: {fresh} — они наверху и отмечены голубой полосой.
            </p>
          ) : null}

          {rows.map(({ request, houseTitle, tourTitle }) => {
            const isNew = request.status === 'new';

            return (
              <div
                key={request.id}
                /* Новая заявка отличается не только словом в углу: рамка,
                   полоса слева и фон. Иначе в списке всё сливается. */
                className={`relative overflow-hidden rounded-[16px] border transition ${
                  isNew ? 'border-ice/45 bg-ice/[0.06]' : 'border-line bg-bg-3'
                }`}
              >
                {isNew ? <span className="bg-ice absolute inset-y-0 left-0 w-1" /> : null}

                <div className={`p-5 ${isNew ? 'pl-6' : ''}`}>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    {isNew ? (
                      <span className="bg-ice/20 text-ice flex size-9 flex-none items-center justify-center rounded-full">
                        <Icon name="requests" className="size-[18px]" />
                      </span>
                    ) : null}
                    <b className={`font-semibold ${isNew ? 'text-[18px]' : 'text-[16px]'}`}>
                      {request.name}
                    </b>
                    <a href={`tel:${request.phone}`} className="text-ice text-[14px]">
                      {request.phone}
                    </a>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                        STATUS_STYLE[request.status] ?? ''
                      }`}
                    >
                      {STATUS_LABEL[request.status]}
                    </span>
                    <span className="text-ink-3 ml-auto text-[12.5px]">
                      {request.createdAt.toLocaleString('ru-RU')}
                    </span>
                  </div>

                  <dl className="text-ink-2 mb-4 grid gap-x-6 gap-y-1 text-[13.5px] sm:grid-cols-2">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-3">Направление</dt>
                      <dd>{request.direction || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-3">Тур</dt>
                      <dd>{tourTitle ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-3">Домик</dt>
                      <dd>{houseTitle ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-3">Даты</dt>
                      <dd>
                        {formatDate(request.dateFrom)} — {formatDate(request.dateTo)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-3">Гостей</dt>
                      <dd>{request.guests}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-3">Питание / баня</dt>
                      <dd>
                        {request.meals ? 'да' : 'нет'} / {request.banya ? 'да' : 'нет'}
                      </dd>
                    </div>
                    {request.comment ? (
                      <div className="sm:col-span-2">
                        <dt className="text-ink-3">Комментарий</dt>
                        <dd className="mt-1">{request.comment}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="border-line flex flex-wrap items-center gap-2 border-t pt-3">
                    <ActionForm
                      action={setRequestStatus}
                      success="Статус обновлён"
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="id" value={request.id} />
                      <span className="w-48">
                        <Select
                          name="status"
                          defaultValue={request.status}
                          options={STATUS_OPTIONS}
                        />
                      </span>
                      <Submit variant="ghost">Обновить</Submit>
                    </ActionForm>

                    <ActionForm
                      action={deleteRequest}
                      success="Заявка удалена"
                      confirm="Удалить заявку навсегда?"
                      className="ml-auto"
                    >
                      <input type="hidden" name="id" value={request.id} />
                      <button
                        type="submit"
                        className="border-busy/40 text-busy hover:bg-busy/10 hover:border-busy/70 cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                      >
                        Удалить
                      </button>
                    </ActionForm>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
