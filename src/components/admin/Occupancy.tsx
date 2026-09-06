'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { occupiedDates } from '@/lib/dates';

/* Шахматка занятости — так это устроено в системах управления бронями:
   домики строками, дни месяца колонками, а бронь — сплошной полосой поперёк
   своих дат с именем гостя внутри.

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

type Bar = { id: string; start: number; span: number; booking: Booking };

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

function human(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function nightsBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

function nightWord(count: number): string {
  const tail = count % 10;
  const teen = count % 100 >= 11 && count % 100 <= 14;
  if (!teen && tail === 1) return 'ночь';
  if (!teen && tail >= 2 && tail <= 4) return 'ночи';
  return 'ночей';
}

/* Карточка при наведении. Рисуется порталом: у строк и панелей вокруг стоит
   overflow, обычный absolute-блок она бы обрезала. */
function Hint({
  rect,
  house,
  booking,
}: {
  rect: DOMRect;
  house: string;
  booking: Booking;
}) {
  const width = 268;
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
  const above = rect.top > 190;

  const nights = nightsBetween(booking.dateFrom, booking.dateTo);

  return createPortal(
    <div
      className="border-line-2 bg-bg-2 pointer-events-none fixed z-[110] rounded-[12px] border p-3.5 shadow-[0_18px_40px_rgb(0_0_0/0.5)]"
      style={{
        width,
        left,
        top: above ? rect.top - 12 : rect.bottom + 12,
        transform: above ? 'translateY(-100%)' : undefined,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`size-2.5 rounded-full ${
            booking.status === 'confirmed' ? 'bg-busy' : 'bg-amber'
          }`}
        />
        <b className="text-[14px]">{house}</b>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            booking.status === 'confirmed' ? 'bg-busy text-bg' : 'bg-amber text-bg'
          }`}
        >
          {booking.status === 'confirmed' ? 'занято' : 'ожидает'}
        </span>
      </div>

      <dl className="text-ink-2 grid gap-1 text-[12.5px]">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-3">Заезд</dt>
          <dd>{human(booking.dateFrom)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-3">Выезд</dt>
          <dd>{human(booking.dateTo)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-3">Ночей</dt>
          <dd>
            {nights} {nightWord(nights)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-3">Гостей</dt>
          <dd>{booking.guests || '—'}</dd>
        </div>
      </dl>

      {booking.note ? (
        <p className="border-line text-ink mt-2 border-t pt-2 text-[12.5px]">{booking.note}</p>
      ) : null}

      <p className="text-aurora mt-2 text-[11.5px]">Нажмите, чтобы изменить или убрать</p>
    </div>,
    document.body,
  );
}

export function Occupancy({
  houses,
  bookings,
  today,
  vehicleCapacity,
  selectedId,
  onSelect,
}: {
  houses: House[];
  bookings: Booking[];
  today: string;
  /* Сколько человек увозит вездеход за одну поездку. */
  vehicleCapacity: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [hint, setHint] = useState<{ rect: DOMRect; bar: Bar } | null>(null);

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
    const bars = new Map<string, Bar[]>();
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
  /* Ширина колонки с названием домика приходит из CSS: на телефоне 132px
     съедали треть и без того узкой таблицы. */
  const columns = `var(--occ-label) repeat(${total}, minmax(0, 1fr))`;
  const houseById = useMemo(
    () => new Map(houses.map((house) => [house.id, house.title])),
    [houses],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Стрелки и месяц — одна группа фиксированной ширины, иначе название
            месяца прыгает по строке вслед за длиной кнопок. */}
        <div className="border-line-2 flex items-center gap-1 rounded-full border p-1">
          <button
            type="button"
            aria-label="Предыдущий месяц"
            onClick={() => setOffset((v) => v - 1)}
            className="text-ink-2 hover:bg-bg-4 hover:text-ink cursor-pointer rounded-full px-3 py-1.5 text-[15px] leading-none"
          >
            ←
          </button>
          <b className="w-[150px] text-center text-[15px] font-bold tabular-nums">
            {MONTHS[view.month]} {view.year}
          </b>
          <button
            type="button"
            aria-label="Следующий месяц"
            onClick={() => setOffset((v) => v + 1)}
            className="text-ink-2 hover:bg-bg-4 hover:text-ink cursor-pointer rounded-full px-3 py-1.5 text-[15px] leading-none"
          >
            →
          </button>
        </div>
        {offset !== 0 ? (
          <button
            type="button"
            onClick={() => setOffset(0)}
            className="text-aurora cursor-pointer text-[13px] font-semibold"
          >
            К текущему месяцу
          </button>
        ) : null}

        <span className="text-ink-3 ml-auto flex flex-wrap items-center gap-4 text-[12.5px]">
          <span className="flex items-center gap-1.5">
            <span className="bg-ok/25 border-ok/40 size-3 rounded-[3px] border" /> свободно
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-busy size-3 rounded-[3px]" /> занято
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-amber size-3 rounded-[3px]" /> ждёт подтверждения
          </span>
        </span>
      </div>

      {/* Горизонтальная прокрутка: 31 колонка на узком экране не помещается,
          но резать месяц пополам хуже, чем дать его пролистать. */}
      <p className="text-ink-3 mb-2 text-[12px] sm:hidden">Таблицу можно листать вбок →</p>

      <div className="border-line bg-bg-3 overflow-x-auto rounded-[16px] border">
        <div className="occ min-w-[680px] p-3 sm:min-w-[760px] sm:p-4">
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

          {/* Строка на домик. Всё — и подложка, и полосы — жёстко в первой
              строке грида: иначе занятые колонки выталкивают подложку вниз,
              и каждый домик рисуется в два этажа. */}
          <div className="grid gap-1.5">
            {houses.map((house) => {
              const list = bars.get(house.id) ?? [];
              return (
                <div
                  key={house.id}
                  className="grid items-center gap-px"
                  style={{ gridTemplateColumns: columns }}
                >
                  <span
                    className="text-ink truncate pr-3 text-[13px] font-semibold"
                    style={{ gridRow: 1, gridColumn: 1 }}
                  >
                    {house.title}
                  </span>

                  {/* Подложка: свободные дни */}
                  {Array.from({ length: total }, (_, i) => {
                    const day = i + 1;
                    const weekend = weekday(view.year, view.month, day) >= 5;
                    return (
                      <span
                        key={day}
                        style={{ gridRow: 1, gridColumn: day + 1 }}
                        className={`h-9 rounded-[4px] ${weekend ? 'bg-ok/15' : 'bg-ok/8'} ${
                          todayDay === day ? 'ring-aurora/50 ring-1 ring-inset' : ''
                        }`}
                      />
                    );
                  })}

                  {/* Полосы броней поверх подложки */}
                  {list.map((bar) => (
                    <button
                      key={bar.id}
                      type="button"
                      onClick={() => onSelect?.(bar.id)}
                      onMouseEnter={(event) =>
                        setHint({ rect: event.currentTarget.getBoundingClientRect(), bar })
                      }
                      onMouseLeave={() => setHint((v) => (v?.bar.id === bar.id ? null : v))}
                      onFocus={(event) =>
                        setHint({ rect: event.currentTarget.getBoundingClientRect(), bar })
                      }
                      onBlur={() => setHint((v) => (v?.bar.id === bar.id ? null : v))}
                      style={{ gridColumn: `${bar.start + 1} / span ${bar.span}`, gridRow: 1 }}
                      className={`z-10 flex h-9 cursor-pointer items-center overflow-hidden rounded-[5px] px-2 text-[11.5px] font-semibold whitespace-nowrap transition ${
                        bar.booking.status === 'confirmed' ? 'bg-busy text-bg' : 'bg-amber text-bg'
                      } ${
                        selectedId === bar.id
                          ? 'ring-aurora ring-2 ring-offset-2 ring-offset-[var(--color-bg-3)]'
                          : /* Пока правится одна бронь, остальные приглушены:
                               видно, какая полоса лежит в форме ниже. */
                            `hover:brightness-110 ${selectedId ? 'opacity-40' : ''}`
                      }`}
                    >
                      <span className="truncate">{bar.booking.note || 'занято'}</span>
                    </button>
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
                {/* Ноль мест — владелец следит только за домиками: тогда людей
                    по-прежнему показываем, но ни с чем не сравниваем. */}
                <span className="text-ink-3 pr-3 text-[12px]">
                  {vehicleCapacity > 0 ? `Гостей · увозим до ${vehicleCapacity}` : 'Гостей'}
                </span>
                {Array.from({ length: total }, (_, i) => {
                  const day = i + 1;
                  const guests = guestsPerDay.get(day) ?? 0;
                  const over = vehicleCapacity > 0 && guests > vehicleCapacity;
                  return (
                    <span
                      key={day}
                      title={
                        over
                          ? `${guests} чел. — за одну поездку вездеход столько не увезёт`
                          : `${guests} чел.`
                      }
                      className={`flex h-6 items-center justify-center rounded-[4px] text-[11px] font-semibold ${
                        guests === 0 ? 'text-ink-3' : over ? 'bg-busy text-bg' : 'bg-ice/20 text-ice'
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

      {hint ? (
        <Hint
          rect={hint.rect}
          booking={hint.bar.booking}
          house={houseById.get(hint.bar.booking.houseId) ?? 'домик удалён'}
        />
      ) : null}
    </div>
  );
}
