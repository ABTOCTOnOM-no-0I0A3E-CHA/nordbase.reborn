import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { houses, requests, tours } from '@/db/schema';
import { AdminHeading, Panel, Select, Submit } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { deleteRequest, setRequestStatus } from '@/lib/admin/request-actions';

export const metadata = { title: 'Заявки' };

const STATUS_LABEL: Record<string, string> = {
  new: 'новая',
  in_work: 'в работе',
  confirmed: 'подтверждена',
  cancelled: 'отменена',
};

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-ice/15 text-ice',
  in_work: 'bg-amber/15 text-amber',
  confirmed: 'bg-ok/15 text-ok',
  cancelled: 'bg-busy/15 text-busy',
};

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
    .orderBy(desc(requests.createdAt));

  return (
    <div>
      <AdminHeading
        title="Заявки"
        description="Приходят с сайта и дублируются в Telegram. Заявка ничего не бронирует: договорились с гостем — отметьте даты в разделе «Занятость»."
        action={
          <a
            href="/admin/requests/export"
            className="border-line-2 text-ink-2 hover:text-ink rounded-full border px-4 py-2 text-[13.5px] font-semibold"
          >
            Выгрузить в таблицу
          </a>
        }
      />

      {rows.length === 0 ? (
        <p className="text-ink-3">Заявок пока нет.</p>
      ) : (
        <div className="grid gap-3">
          {rows.map(({ request, houseTitle, tourTitle }) => (
            <Panel key={request.id}>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <b className="text-[16px] font-semibold">{request.name}</b>
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
                      options={[
                        { value: 'new', label: 'новая' },
                        { value: 'in_work', label: 'в работе' },
                        { value: 'confirmed', label: 'подтверждена' },
                        { value: 'cancelled', label: 'отменена' },
                      ]}
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
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
