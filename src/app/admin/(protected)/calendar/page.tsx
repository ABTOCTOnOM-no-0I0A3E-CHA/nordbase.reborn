import { asc, gte } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, houses } from '@/db/schema';
import { AdminHeading } from '@/components/admin/ui';
import { BookingBoard } from '@/components/admin/BookingBoard';
import { todayIso } from '@/lib/dates';

export const metadata = { title: 'Занятость' };

export default async function CalendarPage() {
  const today = todayIso();
  /* Показываем и прошлый месяц: календарь листается назад. */
  const from = `${today.slice(0, 8)}01`;

  const [houseRows, bookingRows] = await Promise.all([
    db.select().from(houses).orderBy(asc(houses.sort)),
    db.select().from(bookings).where(gte(bookings.dateTo, from)).orderBy(asc(bookings.dateFrom)),
  ]);

  return (
    <div>
      <AdminHeading
        title="Занятость домиков"
        description="Даты вы отмечаете сами — автоматически ничего не бронируется. Что отмечено здесь, то гость видит на сайте как занятое."
      />

      <BookingBoard
        today={today}
        vehicleCapacity={8}
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
      />
    </div>
  );
}
