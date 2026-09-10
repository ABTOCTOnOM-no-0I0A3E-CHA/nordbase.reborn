import { asc, gte } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, houses } from '@/db/schema';
import { AdminHeading } from '@/components/admin/ui';
import { BookingBoard } from '@/components/admin/BookingBoard';
import { todayIso } from '@/lib/dates';
import { loadOccupancySettings } from '@/lib/occupancy-settings';

export const metadata = { title: 'Занятость' };

export default async function CalendarPage() {
  const today = todayIso();
  /* Показываем и прошлый месяц: календарь листается назад. */
  const from = `${today.slice(0, 8)}01`;

  const [houseRows, bookingRows, occupancy] = await Promise.all([
    db.select().from(houses).orderBy(asc(houses.sort)),
    db.select().from(bookings).where(gte(bookings.dateTo, from)).orderBy(asc(bookings.dateFrom)),
    loadOccupancySettings(),
  ]);

  return (
    <div>
      <AdminHeading
        title="Занятость домиков"
        description="Даты вы отмечаете сами — автоматически ничего не бронируется. Что отмечено здесь, то гость видит на сайте как занятое."
      />

      <BookingBoard
        today={today}
        vehicleCapacity={occupancy.seats}
        houses={houseRows.map((house) => ({
          id: house.id,
          title: house.title,
          capacity: house.capacity,
          minGuests: house.minGuests,
          kind: house.kind,
        }))}
        bookings={bookingRows.map((booking) => ({
          id: booking.id,
          houseId: booking.houseId,
          dateFrom: booking.dateFrom,
          dateTo: booking.dateTo,
          guests: booking.guests,
          status: booking.status,
          note: booking.note,
          contactKind: booking.contactKind,
          contactValue: booking.contactValue,
        }))}
      />
    </div>
  );
}
