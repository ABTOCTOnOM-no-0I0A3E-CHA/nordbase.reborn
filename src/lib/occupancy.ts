import 'server-only';
import { and, gte, lte, ne } from 'drizzle-orm';
import { db } from '@/db';
import { bookings } from '@/db/schema';

/* Занятые даты по домикам. Сайт и админка читают одну таблицу bookings —
   если развести на два источника, они разойдутся в первый же месяц. */

export type BusyByHouse = Record<string, string[]>;

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function loadBusyDates(monthsAhead = 12): Promise<BusyByHouse> {
  const from = new Date().toISOString().slice(0, 10);
  const to = addDays(from, monthsAhead * 31);

  const rows = await db
    .select({
      houseId: bookings.houseId,
      dateFrom: bookings.dateFrom,
      dateTo: bookings.dateTo,
    })
    .from(bookings)
    .where(
      and(
        ne(bookings.status, 'cancelled'),
        /* Пересечение интервала брони с окном [from; to] */
        lte(bookings.dateFrom, to),
        gte(bookings.dateTo, from),
      ),
    );

  const busy: BusyByHouse = {};

  for (const row of rows) {
    const list = busy[row.houseId] ?? [];
    /* Разворачиваем интервал в перечень дат: их немного, а проверять занятость
       в браузере так можно одним includes, без арифметики диапазонов. */
    let cursor = row.dateFrom < from ? from : row.dateFrom;
    const end = row.dateTo > to ? to : row.dateTo;
    while (cursor <= end) {
      list.push(cursor);
      cursor = addDays(cursor, 1);
    }
    busy[row.houseId] = list;
  }

  return busy;
}
