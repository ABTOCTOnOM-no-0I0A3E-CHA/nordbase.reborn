import { asc, gte } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, houses } from '@/db/schema';
import { AdminHeading, EmptyState, Panel } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { Occupancy } from '@/components/admin/Occupancy';
import { todayIso } from '@/lib/dates';
import { BookingForm } from '@/components/admin/BookingForm';
import { deleteBooking } from '@/lib/admin/request-actions';

export const metadata = { title: 'Занятость' };

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

export default async function CalendarPage() {
  const today = todayIso();
  /* Показываем и прошлый месяц: календарь листается назад. */
  const from = `${today.slice(0, 8)}01`;

  const [houseRows, bookingRows] = await Promise.all([
    db.select().from(houses).orderBy(asc(houses.sort)),
    db.select().from(bookings).where(gte(bookings.dateTo, from)).orderBy(asc(bookings.dateFrom)),
  ]);

  const houseById = new Map(houseRows.map((h) => [h.id, h.title]));
  const upcoming = bookingRows.filter((booking) => booking.status !== 'cancelled');

  return (
    <div>
      <AdminHeading
        title="Занятость домиков"
        description="Даты вы отмечаете сами — автоматически ничего не бронируется. Что отмечено здесь, то гость видит на сайте как занятое."
      />

      <div className="mb-6">
        <Occupancy
          today={today}
          houses={houseRows.map((house) => ({ id: house.id, title: house.title }))}
          bookings={bookingRows.map((booking) => ({
            id: booking.id,
            houseId: booking.houseId,
            dateFrom: booking.dateFrom,
            dateTo: booking.dateTo,
            guests: booking.guests,
            status: booking.status,
            note: booking.note,
          }))}
          /* Вместимость вездехода из брифа: базово 4, в поездку берут до 8. */
          vehicleCapacity={8}
        />
      </div>

      <Panel
        className="mb-6"
        title="Отметить занятые даты"
        description="Подтвердили заезд по телефону — впишите даты здесь, и они пропадут из свободных на сайте."
      >
        <BookingForm houses={houseRows.map((h) => ({ id: h.id, title: h.title }))} />
      </Panel>

      <Panel title="Все брони" description="Ближайшие сверху.">
        {upcoming.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Занятых дат нет"
            description="Пока вы ничего не отметили, гость видит все даты свободными."
          />
        ) : (
          <div className="grid gap-2">
            {upcoming.map((booking) => (
              <div
                key={booking.id}
                className="border-line flex flex-wrap items-center gap-3 border-b pb-2.5 text-[13.5px] last:border-b-0 last:pb-0"
              >
                <span
                  className={`size-2.5 flex-none rounded-full ${
                    booking.status === 'confirmed' ? 'bg-busy' : 'bg-amber'
                  }`}
                />
                <b>{houseById.get(booking.houseId) ?? 'домик удалён'}</b>
                <span className="text-ink-2">
                  {formatDate(booking.dateFrom)} — {formatDate(booking.dateTo)}
                </span>
                {booking.guests ? (
                  <span className="text-ink-3">{booking.guests} чел.</span>
                ) : null}
                {booking.note ? <span className="text-ink-3">{booking.note}</span> : null}
                <span className="text-ink-3 text-[12px]">
                  {booking.status === 'confirmed' ? 'подтверждена' : 'придержана'}
                </span>

                <ActionForm
                  action={deleteBooking}
                  success="Даты снова свободны"
                  confirm="Убрать бронь? Даты снова станут свободными."
                  className="ml-auto"
                >
                  <input type="hidden" name="id" value={booking.id} />
                  <button
                    type="submit"
                    className="border-busy/40 text-busy hover:bg-busy/10 hover:border-busy/70 cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                  >
                    Убрать
                  </button>
                </ActionForm>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
