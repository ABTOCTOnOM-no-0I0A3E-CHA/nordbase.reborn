import { asc, eq, gte } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, houses } from '@/db/schema';
import { AdminHeading, ConfirmSubmit, Panel } from '@/components/admin/ui';
import { occupiedDates, todayIso } from '@/lib/dates';
import { BookingForm } from '@/components/admin/BookingForm';
import { deleteBooking } from '@/lib/admin/request-actions';

export const metadata = { title: 'Занятость' };

const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

/* Дата в виде ГГГГ-ММ-ДД без часовых поясов: бронь — это календарный день,
   а не момент времени, и переводить её в Date значит однажды уехать на сутки. */
function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export default async function CalendarPage() {
  const today = new Date(`${todayIso()}T00:00:00Z`);
  const startIso = isoDate(today.getUTCFullYear(), today.getUTCMonth(), 1);

  const [houseRows, bookingRows] = await Promise.all([
    db.select().from(houses).orderBy(asc(houses.sort)),
    db.select().from(bookings).where(gte(bookings.dateTo, startIso)).orderBy(asc(bookings.dateFrom)),
  ]);

  /* Разворачиваем интервалы в множество занятых дат по каждому домику —
     на трёх месяцах это сотни значений, проверять принадлежность так проще всего. */
  const busy = new Map<string, Set<string>>();
  for (const booking of bookingRows) {
    if (booking.status === 'cancelled') continue;
    const set = busy.get(booking.houseId) ?? new Set<string>();
    /* Полуоткрытый интервал: день выезда уже свободен. */
    for (const date of occupiedDates(booking.dateFrom, booking.dateTo)) set.add(date);
    busy.set(booking.houseId, set);
  }

  const months = [0, 1, 2].map((offset) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
  });

  const houseById = new Map(houseRows.map((h) => [h.id, h.title]));

  return (
    <div>
      <AdminHeading
        title="Занятость домиков"
        description="Даты вы отмечаете сами — автоматически ничего не бронируется. Что отмечено здесь, то гость видит на сайте как занятое."
      />

      <div className="mb-8 grid gap-6">
        {months.map(({ year, month }) => (
          <Panel key={`${year}-${month}`}>
            <h2 className="mb-4 text-[15px] font-bold">
              {MONTHS[month]} {year}
            </h2>
            <div className="grid gap-3">
              {houseRows.map((house) => {
                const set = busy.get(house.id) ?? new Set<string>();
                return (
                  <div key={house.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-ink-2 w-32 flex-none text-[13px]">{house.title}</span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: daysInMonth(year, month) }, (_, i) => {
                        const iso = isoDate(year, month, i + 1);
                        const occupied = set.has(iso);
                        return (
                          <span
                            key={iso}
                            title={`${iso}: ${occupied ? 'занято' : 'свободно'}`}
                            className={`flex size-6 items-center justify-center rounded-[5px] text-[10.5px] ${
                              occupied ? 'bg-busy/20 text-busy' : 'bg-ok/10 text-ok'
                            }`}
                          >
                            {i + 1}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="mb-8">
        <h2 className="mb-1 text-[15px] font-bold">Добавить бронь</h2>
        <p className="text-ink-3 mb-4 text-[13px]">
          Подтвердили заезд по телефону — отметьте даты здесь, чтобы они пропали из свободных.
        </p>
        <BookingForm houses={houseRows.map((h) => ({ id: h.id, title: h.title }))} />
      </Panel>

      <Panel>
        <h2 className="mb-4 text-[15px] font-bold">Ближайшие брони</h2>
        {bookingRows.length === 0 ? (
          <p className="text-ink-3 text-[13.5px]">Броней нет.</p>
        ) : (
          <div className="grid gap-2">
            {bookingRows.map((booking) => (
              <div
                key={booking.id}
                className="border-line flex flex-wrap items-center gap-3 border-b pb-2 text-[13.5px] last:border-b-0"
              >
                <b>{houseById.get(booking.houseId) ?? 'домик удалён'}</b>
                <span className="text-ink-2">
                  {booking.dateFrom} — {booking.dateTo}
                </span>
                {booking.note ? <span className="text-ink-3">{booking.note}</span> : null}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    booking.status === 'confirmed'
                      ? 'bg-ok/15 text-ok'
                      : booking.status === 'hold'
                        ? 'bg-amber/15 text-amber'
                        : 'bg-busy/15 text-busy'
                  }`}
                >
                  {booking.status === 'confirmed'
                    ? 'подтверждена'
                    : booking.status === 'hold'
                      ? 'придержана'
                      : 'отменена'}
                </span>
                <form action={deleteBooking} className="ml-auto">
                  <input type="hidden" name="id" value={booking.id} />
                  <ConfirmSubmit message="Удалить бронь? Даты снова станут свободными.">
                    Удалить
                  </ConfirmSubmit>
                </form>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
