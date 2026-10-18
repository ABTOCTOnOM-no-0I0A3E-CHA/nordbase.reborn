import 'server-only';
import { and, asc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { requests } from '@/db/schema';
import { sendPush } from './push';

/* Напоминания о необработанных заявках.

   На базе интернет пропадает надолго. Push, отправленный в момент заявки,
   сервис уведомлений хранит ограниченное время и отдаёт телефону при первой
   же возможности — но если доставка сорвалась, второй попытки не будет, и
   заявка так и останется незамеченной. Поэтому, пока заявку не открыли в
   панели, повторяем уведомление: вернулась связь — пришло напоминание.

   Повтор не плодит уведомления на экране: у всех повторов одной заявки общая
   метка, и новое просто заменяет предыдущее. */

/* Как часто напоминать и сколько всего раз: шесть часов тишины — это уже
   не «не заметил», а «решил не отвечать», дёргать дальше бессмысленно. */
const EVERY_MINUTES = 15;
const MAX_REMINDERS = 24;

export async function sendPendingReminders(): Promise<number> {
  const deadline = new Date(Date.now() - EVERY_MINUTES * 60 * 1000);
  const oldest = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: requests.id,
      name: requests.name,
      phone: requests.phone,
      guests: requests.guests,
      dateFrom: requests.dateFrom,
      dateTo: requests.dateTo,
      notifyCount: requests.notifyCount,
    })
    .from(requests)
    .where(
      and(
        eq(requests.status, 'new'),
        gt(requests.createdAt, oldest),
        lt(requests.notifyCount, MAX_REMINDERS),
        or(isNull(requests.notifiedAt), lt(requests.notifiedAt, deadline)),
      ),
    )
    .orderBy(asc(requests.createdAt))
    .limit(10);

  let sent = 0;

  for (const row of rows) {
    const dates = row.dateFrom && row.dateTo ? `${row.dateFrom} — ${row.dateTo}` : '';
    const body = [row.name, row.phone, dates, `${row.guests} гостей`]
      .filter((part) => part && String(part).trim().length > 0)
      .join(' · ');

    const result = await sendPush(
      row.notifyCount === 0 ? 'Новая заявка' : 'Заявка ждёт ответа',
      body,
      `/admin/requests#${row.id}`,
      { tag: `request-${row.id}` },
    );

    /* Отметку ставим в любом случае: если устройств нет вовсе или сервис
       уведомлений отказал, долбиться каждую минуту смысла нет. */
    await db
      .update(requests)
      .set({ notifiedAt: new Date(), notifyCount: sql`${requests.notifyCount} + 1` })
      .where(eq(requests.id, row.id));

    if (result.ok) sent += 1;
  }

  return sent;
}
