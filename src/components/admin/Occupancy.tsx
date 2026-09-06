'use client';

import { useMemo, useState } from 'react';
import { occupiedDates } from '@/lib/dates';

/* Шахматка занятости — так это устроено в системах управления бронями:
   домики строками, дни месяца колонками, а бронь — сплошной полосой поперёк
   своих дат с именем гостя внутри. Прошлая версия рисовала 30 отдельных
   квадратиков в строку: понять, где начинается и заканчивается заезд, было
   невозможно.

   Сверху — сводка по дню. Домик не единственный ограниченный ресурс: сколько
   бы групп ни ехало, вездеход берёт до 8 человек за поездку. Поэтому в сводке
   две цифры: сколько домиков свободно и сколько людей стоит на эту дату. */

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

const WEEKDAY_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

export type House = { id: string; title: string };
export type Booking = {
  id: string;
  houseId: string;
  dateFrom: string;
  dateTo: string;
  guests: number;
  status: 'hold' | 'confirmed' | 'cancelled';
  note: string;
};

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function weekday(year: number, month: number, day: number): number {
  /* 0 — понедельник. */
  return (new Date(Date.UTC(year, month, day)).getUTCDay() + 6) % 7;
}

export function Occupancy({
  houses,
  bookings,
  today,
  vehicleCapacity,
}: {
  houses: House[];
  bookings: Booking[];
  today: string;
  /* Сколько человек увозит вездеход за одну поездку. */
  vehicleCapacity: number;
}) {
  const [offset, setOffset] = useState(0);

  const view = useMemo(() => {
    const base = new Date(`${today}T00:00:00Z`);
    const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
  }, [today, offset]);

  const total = daysInMonth(view.year, view.month);
  const firstIso = iso(view.year, view.month, 1);
  const lastIso = iso(view.year, view.month, total);

  /* Для каждого домика — отрезки, попадающие в этот месяц; заодно копим
     сводку по дням. Полоса рисуется от дня заезда до дня перед выездом:
     день выезда уже свободен. */
  const { bars, busyHouses, guestsPerDay } = useMemo(() => {
    const bars = new Map<string, { id: string; start: number; span: number; booking: Booking }[]>();
    const busyHouses = new Map<number, Set<string>>();
    const guestsPerDay = new Map<number, number>();

    for (const booking of bookings) {
      if (booking.status === 'cancelled') continue;
      const nights = occupiedDates(booking.dateFrom, booking.dateTo).filter(
        (date) => date >= firstIso && date <= lastIso,
      );
      if (nights.length === 0) continue;

      const startDay = Number(nights[0]!.slice(8, 10));
      const list = bars.get(booking.houseId) ?? [];
      list.push({ id: booking.id, start: startDay, span: nights.length, booking });
      bars.set(booking.houseId, list);

      for (const night of nights) {
        const day = Number(night.slice(8, 10));
        const set = busyHouses.get(day) ?? new Set<string>();
        set.add(booking.houseId);
        busyHouses.set(day, set);
        guestsPerDay.set(day, (guestsPerDay.get(day) ?? 0) + booking.guests);
      }
    }

    return { bars, busyHouses, guestsPerDay };
  }, [bookings, firstIso, lastIso]);

  const todayDay = today.slice(0, 7) === firstIso.slice(0, 7) ? Number(today.slice(8, 10)) : null;
  const columns = `132px repeat(${total}, minmax(0, 1fr))`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOffset((v) => v - 1)}
          className="border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px]"
        >
          ← Раньше
        </button>
        <b className="min-w-44 text-center text-[16px] font-bold">
          {MONTHS[view.month]} {view.year}
        </b>
        <button
          type="button"
          onClick={() => setOffset((v) => v + 1)}
          className="border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px]"
        >
          Позже →
        </button>
        {offset !== 0 ? (
          <button
            type="button"
            onClick={() => setOffset(0)}
            className="text-ink-3 hover:text-ink cursor-pointer text-[13px]"
          >
            Сегодня
          </button>
        ) : null}

        <span className="text-ink-3 ml-auto flex flex-wrap items-center gap-4 text-[12.5px]">
          <span className="flex items-center gap-1.5">
            <span className="bg-ok/25 border-ok/40 size-3 rounded-[3px] border" /> свободно
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-busy size-3 rounded-[3px]" /> подтверждена
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-amber size-3 rounded-[3px]" /> придержана
          </span>
        </span>
      </div>

      {/* Горизонтальная прокрутка: 31 колонка на узком экране не помещается,
          но резать месяц пополам хуже, чем дать его пролистать. */}
      <div className="border-line bg-bg-3 overflow-x-auto rounded-[16px] border">
        <div className="min-w-[760px] p-4">
          {/* Числа месяца и дни недели */}
          <div className="mb-2 grid gap-px" style={{ gridTemplateColumns: columns }}>
            <span />
            {Array.from({ length: total }, (_, i) => {
              const day = i + 1;
              const weekend = weekday(view.year, view.month, day) >= 5;
              const isToday = todayDay === day;
              return (
                <span
                  key={day}
                  className={`text-center text-[10.5px] leading-tight ${
                    isToday ? 'text-aurora font-bold' : weekend ? 'text-ink-3' : 'text-ink-2'
                  }`}
                >
                  <span className="block">{day}</span>
                  <span className="block text-[9px] opacity-70">
                    {WEEKDAY_SHORT[weekday(view.year, view.month, day)]}
                  </span>
                </span>
              );
            })}
          </div>

          {/* Строка на домик */}
          <div className="grid gap-1.5">
            {houses.map((house) => {
              const list = bars.get(house.id) ?? [];
              return (
                <div
                  key={house.id}
                  className="relative grid items-center gap-px"
                  style={{ gridTemplateColumns: columns }}
                >
                  <span className="text-ink truncate pr-3 text-[13px] font-semibold">
                    {house.title}
                  </span>

                  {/* Подложка: свободные дни */}
                  {Array.from({ length: total }, (_, i) => {
                    const day = i + 1;
                    const weekend = weekday(view.year, view.month, day) >= 5;
                    return (
                      <span
                        key={day}
                        className={`h-9 rounded-[4px] ${weekend ? 'bg-ok/15' : 'bg-ok/8'} ${
                          todayDay === day ? 'ring-aurora/50 ring-1 ring-inset' : ''
                        }`}
                      />
                    );
                  })}

                  {/* Полосы броней поверх подложки */}
                  {list.map((bar) => (
                    <span
                      key={bar.id}
                      title={`${bar.booking.dateFrom} — ${bar.booking.dateTo}${
                        bar.booking.guests ? ` · ${bar.booking.guests} чел.` : ''
                      }${bar.booking.note ? ` · ${bar.booking.note}` : ''}`}
                      style={{ gridColumn: `${bar.start + 1} / span ${bar.span}`, gridRow: 1 }}
                      className={`z-10 flex h-9 items-center overflow-hidden rounded-[5px] px-2 text-[11.5px] font-semibold whitespace-nowrap ${
                        bar.booking.status === 'confirmed' ? 'bg-busy text-bg' : 'bg-amber text-bg'
                      }`}
                    >
                      <span className="truncate">{bar.booking.note || 'занято'}</span>
                    </span>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Сводка по дню: свободные домики и число людей */}
          {houses.length > 0 ? (
            <div className="border-line mt-3 border-t pt-3">
              <div className="grid items-center gap-px" style={{ gridTemplateColumns: columns }}>
                <span className="text-ink-3 pr-3 text-[12px]">Свободно домиков</span>
                {Array.from({ length: total }, (_, i) => {
                  const day = i + 1;
                  const free = houses.length - (busyHouses.get(day)?.size ?? 0);
                  return (
                    <span
                      key={day}
                      title={free === 0 ? 'все домики заняты' : `свободно домиков: ${free}`}
                      className={`flex h-6 items-center justify-center rounded-[4px] text-[11px] font-semibold ${
                        free === 0
                          ? 'bg-busy text-bg'
                          : free === houses.length
                            ? 'text-ink-3'
                            : 'bg-amber/25 text-amber'
                      }`}
                    >
                      {free}
                    </span>
                  );
                })}
              </div>

              <div
                className="mt-1 grid items-center gap-px"
                style={{ gridTemplateColumns: columns }}
              >
                <span className="text-ink-3 pr-3 text-[12px]">
                  Гостей · вездеход до {vehicleCapacity}
                </span>
                {Array.from({ length: total }, (_, i) => {
                  const day = i + 1;
                  const guests = guestsPerDay.get(day) ?? 0;
                  const over = guests > vehicleCapacity;
                  return (
                    <span
                      key={day}
                      title={
                        over
                          ? `${guests} чел. — за одну поездку вездеход столько не увезёт`
                          : `${guests} чел.`
                      }
                      className={`flex h-6 items-center justify-center rounded-[4px] text-[11px] font-semibold ${
                        guests === 0
                          ? 'text-ink-3'
                          : over
                            ? 'bg-busy text-bg'
                            : 'bg-ice/20 text-ice'
                      }`}
                    >
                      {guests || '·'}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-ink-3 py-6 text-center text-[13.5px]">
              Сначала заведите домики — занятость отмечается по ним.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
