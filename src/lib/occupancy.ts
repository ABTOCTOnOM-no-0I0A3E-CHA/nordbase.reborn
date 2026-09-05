import 'server-only';
import { and, gt, lt, ne } from 'drizzle-orm';
import { db } from '@/db';
import { bookings } from '@/db/schema';
import { addDays, occupiedDates, todayIso } from './dates';

/* Занятые даты по домикам. Сайт и админка читают одну таблицу bookings —
   если развести на два источника, они разойдутся в первый же месяц.

   Интервал полуоткрытый: [заезд; выезд). День выезда свободен, иначе оборот
   «одни выехали утром, другие заехали днём» становится невозможен. */

export type BusyByHouse = Record<string, string[]>;

export async function loadBusyDates(monthsAhead = 12): Promise<BusyByHouse> {
  const from = todayIso();
  const to = addDays(from, monthsAhead * 31);

  const rows = await db
    .select({
      houseId: bookings.houseId,
      dateFrom: bookings.dateFrom,
      dateTo: bookings.dateTo,
    })
    .from(bookings)
    .where(and(ne(bookings.status, 'cancelled'), lt(bookings.dateFrom, to), gt(bookings.dateTo, from)));

  const busy: BusyByHouse = {};

  for (const row of rows) {
    const list = busy[row.houseId] ?? [];
    /* Разворачиваем интервал в перечень дат: их немного, а проверять занятость
       в браузере так можно одним includes, без арифметики диапазонов. */
    const start = row.dateFrom < from ? from : row.dateFrom;
    const end = row.dateTo > to ? to : row.dateTo;
    list.push(...occupiedDates(start, end));
    busy[row.houseId] = list;
  }

  return busy;
}
