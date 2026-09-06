'use client';

import { useMemo, useState } from 'react';

/* Календарь занятости для гостя.

   Гостю не нужна шахматка по домикам: ему важно одно — можно ли приехать в
   эти числа. Поэтому день показывается тремя состояниями: свободно, остались
   последние домики, всё занято. Сколько именно домиков занято и кем — не его
   дело и не его забота.

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

  /* Дата → сколько домиков занято. */
  const takenPerDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const dates of Object.values(busyByHouse)) {
      for (const date of dates) map.set(date, (map.get(date) ?? 0) + 1);
    }
    return map;
  }, [busyByHouse]);

  const base = new Date(`${today}T00:00:00Z`);
  const view = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
  const year = view.getUTCFullYear();
  const month = view.getUTCMonth();

  const total = daysInMonth(year, month);
  /* getUTCDay: 0 — воскресенье, а неделя у нас начинается с понедельника. */
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;

  /* Дальше выбранного горизонта не листаем: там всё равно всё свободно. */
  const canGoBack = offset > 0;
  const canGoForward = offset < months - 1;

  return (
    <div className="border-line bg-bg-3 rounded-[18px] border p-4 sm:p-6">
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
        <b className="text-[17px] font-bold">
          {MONTHS[month]} {year}
        </b>
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

      <div className="text-ink-3 mb-1.5 grid grid-cols-7 gap-1 text-center text-[11.5px] sm:gap-1.5">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
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
                      ? 'остались последние домики'
                      : 'свободно'
              }
              className={`flex aspect-square items-center justify-center rounded-[10px] text-[13.5px] tabular-nums sm:text-[14.5px] ${
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

      <div className="text-ink-2 mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
        <span className="flex items-center gap-2">
          <span className="bg-ok/15 size-3.5 rounded-[4px]" /> свободно
        </span>
        <span className="flex items-center gap-2">
          <span className="bg-amber/20 size-3.5 rounded-[4px]" /> остались последние домики
        </span>
        <span className="flex items-center gap-2">
          <span className="bg-busy/20 size-3.5 rounded-[4px]" /> занято
        </span>
      </div>

      <p className="text-ink-3 mt-3 text-[12.5px] leading-[1.5]">
        Календарь показывает домики базы. Даже если числа заняты, напишите — подскажем ближайшие
        свободные или поставим в лист ожидания.
      </p>
    </div>
  );
}
