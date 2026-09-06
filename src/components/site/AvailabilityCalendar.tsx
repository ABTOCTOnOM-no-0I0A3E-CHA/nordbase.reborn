'use client';

import { useEffect, useMemo, useState } from 'react';

/* Календарь занятости для гостя.

   Гостю не нужна шахматка по домикам: ему важно одно — можно ли приехать в
   эти числа. Поэтому день показывается тремя состояниями: свободно, часть
   домиков занята, всё занято.

   Ширина ограничена намеренно. Календарь, растянутый на всю секцию, давал
   клетки по 150 пикселей — таблица месяца превращалась в семь огромных
   квадратов в ряд. На широком экране вместо этого показываем два месяца
   рядом: и место занято делом, и планировать удобнее.

   Данные те же, что и в панели: перечень занятых дат по каждому домику. */

const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function Month({
  year,
  month,
  today,
  houseCount,
  takenPerDay,
}: {
  year: number;
  month: number;
  today: string;
  houseCount: number;
  takenPerDay: Map<string, number>;
}) {
  const total = daysInMonth(year, month);
  /* getUTCDay: 0 — воскресенье, а неделя у нас начинается с понедельника. */
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;

  return (
    <div>
      <b className="mb-3 block text-center text-[15px] font-semibold">
        {MONTHS[month]} {year}
      </b>

      <div className="text-ink-3 mb-1 grid grid-cols-7 gap-1 text-center text-[11px]">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}

        {Array.from({ length: total }, (_, i) => {
          const day = i + 1;
          const date = iso(year, month, day);
          const past = date < today;
          const taken = takenPerDay.get(date) ?? 0;
          const full = houseCount > 0 && taken >= houseCount;
          const last = !full && taken > 0;

          return (
            <span
              key={date}
              title={
                past
                  ? undefined
                  : full
                    ? 'всё занято'
                    : last
                      ? 'свободны не все домики'
                      : 'свободно'
              }
              className={`flex h-9 items-center justify-center rounded-[8px] text-[13.5px] tabular-nums ${
                past
                  ? 'text-ink-3/40'
                  : full
                    ? 'bg-busy/20 text-busy line-through'
                    : last
                      ? 'bg-amber/20 text-amber'
                      : 'bg-ok/15 text-ink'
              }`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function AvailabilityCalendar({
  busyByHouse,
  houseCount,
  today,
  months,
}: {
  busyByHouse: Record<string, string[]>;
  houseCount: number;
  today: string;
  months: number;
}) {
  const [offset, setOffset] = useState(0);
  const [pair, setPair] = useState(false);

  /* Два месяца рядом помещаются только на широком экране. */
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const sync = () => setPair(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  /* Дата → сколько домиков занято. */
  const takenPerDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const dates of Object.values(busyByHouse)) {
      for (const date of dates) map.set(date, (map.get(date) ?? 0) + 1);
    }
    return map;
  }, [busyByHouse]);

  const shown = pair ? Math.min(2, months) : 1;
  const base = new Date(`${today}T00:00:00Z`);

  const visible = Array.from({ length: shown }, (_, i) => {
    const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset + i, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
  });

  const canGoBack = offset > 0;
  const canGoForward = offset + shown < months;

  return (
    /* Календарь узкий и стоит по центру секции: растягивать таблицу месяца на
       всю ширину страницы незачем. */
    <div className="border-line bg-bg-3 mx-auto max-w-[680px] rounded-[18px] border p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Предыдущий месяц"
          disabled={!canGoBack}
          onClick={() => setOffset((v) => v - 1)}
          className="border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink flex size-10 flex-none cursor-pointer items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-25"
        >
          ←
        </button>
        <span className="text-ink-3 text-[13px]">Домики базы на Рыбачьем</span>
        <button
          type="button"
          aria-label="Следующий месяц"
          disabled={!canGoForward}
          onClick={() => setOffset((v) => v + 1)}
          className="border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink flex size-10 flex-none cursor-pointer items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-25"
        >
          →
        </button>
      </div>

      <div className={`grid gap-6 ${shown > 1 ? 'md:grid-cols-2' : ''}`}>
        {visible.map((item) => (
          <Month
            key={`${item.year}-${item.month}`}
            year={item.year}
            month={item.month}
            today={today}
            houseCount={houseCount}
            takenPerDay={takenPerDay}
          />
        ))}
      </div>

      <div className="border-line text-ink-2 mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-[12.5px]">
        <span className="flex items-center gap-2">
          <span className="bg-ok/15 size-3.5 rounded-[4px]" /> свободно
        </span>
        <span className="flex items-center gap-2">
          <span className="bg-amber/20 size-3.5 rounded-[4px]" /> свободны не все домики
        </span>
        <span className="flex items-center gap-2">
          <span className="bg-busy/20 size-3.5 rounded-[4px]" /> занято
        </span>
      </div>

      <p className="text-ink-3 mt-3 text-[12.5px] leading-[1.5]">
        Календарь про домики на полуострове Рыбачий: туры по Териберке проходят без ночёвки на
        базе, их даты обсуждаем отдельно. Даже если числа заняты — напишите, подскажем ближайшие
        свободные.
      </p>
    </div>
  );
}
