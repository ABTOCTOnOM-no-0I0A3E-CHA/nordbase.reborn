/* Даты брони — календарные, без времени. Считать «сегодня» по UTC нельзя:
   в Мурманске (UTC+3) до трёх ночи это даст вчерашнее число, и датапикер
   с окном занятости уедут на сутки. Часовой пояс базы фиксирован. */

const TIME_ZONE = 'Europe/Moscow';

/* en-CA даёт ровно ГГГГ-ММ-ДД — тот же формат, что и в колонках date. */
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayIso(): string {
  return formatter.format(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/* Даты, которые бронь реально занимает: день выезда свободен — в него заезжает
   следующий гость. Интервал полуоткрытый: [заезд; выезд). */
export function occupiedDates(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = from;
  while (cursor < to) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}
