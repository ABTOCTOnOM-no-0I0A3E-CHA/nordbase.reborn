import { asc, eq, gte } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, houses, tourBookings, tours } from '@/db/schema';
import { AdminHeading } from '@/components/admin/ui';
import { BookingBoard } from '@/components/admin/BookingBoard';
import { TourBookings } from '@/components/admin/TourBookings';
import { todayIso } from '@/lib/dates';
import { loadOccupancySettings } from '@/lib/occupancy-settings';

export const metadata = { title: 'Занятость' };

export default async function CalendarPage() {
  const today = todayIso();
  /* Показываем и прошлый месяц: календарь листается назад. */
  const from = `${today.slice(0, 8)}01`;

  const [houseRows, bookingRows, occupancy, tourRows, tourBookingRows] = await Promise.all([
    db.select().from(houses).orderBy(asc(houses.sort)),
    db.select().from(bookings).where(gte(bookings.dateTo, from)).orderBy(asc(bookings.dateFrom)),
    loadOccupancySettings(),
    db
      .select({ id: tours.id, title: tours.title })
      .from(tours)
      .where(eq(tours.status, 'published'))
      .orderBy(asc(tours.sort)),
    db
      .select()
      .from(tourBookings)
      .where(gte(tourBookings.dateTo, from))
      .orderBy(asc(tourBookings.dateFrom)),
  ]);

  return (
    <div>
      <AdminHeading
        title="Занятость"
        description="Домики и кемпы сверху, туры отдельно ниже. Даты вы отмечаете сами — автоматически ничего не бронируется."
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

      <TourBookings
        tours={tourRows}
        seats={occupancy.seats}
        today={today}
        items={tourBookingRows.map((row) => ({
          id: row.id,
          tourId: row.tourId,
          dateFrom: row.dateFrom,
          dateTo: row.dateTo,
          guests: row.guests,
          status: row.status,
          note: row.note,
        }))}
      />
    </div>
  );
}
