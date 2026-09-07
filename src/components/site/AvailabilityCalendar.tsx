'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays } from '@/lib/dates';
import { usePickedDates } from './PickedDates';

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

function human(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function nightsBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function nightWord(count: number): string {
  const tail = count % 10;
  const teen = count % 100 >= 11 && count % 100 <= 14;
  if (!teen && tail === 1) return 'ночь';
  if (!teen && tail >= 2 && tail <= 4) return 'ночи';
  return 'ночей';
}

function Month({
  year,
  month,
  today,
  houseCount,
  takenPerDay,
  from,
  to,
  onPick,
}: {
  year: number;
  month: number;
  today: string;
  houseCount: number;
  takenPerDay: Map<string, number>;
  from: string;
  to: string;
  onPick: (date: string) => void;
}) {
  const total = daysInMonth(year, month);
  /* getUTCDay: 0 — воскресенье, а неделя у нас начинается с понедельника. */
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;

  return (
    /* Ниже этой ширины числа в квадратиках начинают жаться друг к другу,
       поэтому месяц не сжимаем, а даём прокрутить — см. обёртку ниже. */
    <div className="min-w-[344px] flex-none">
      <b className="mb-3 block text-center text-[15px] font-semibold">
        {MONTHS[month]} {year}
      </b>

      <div className="text-ink-3 mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[11.5px]">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
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

          /* Выезд входит в выделение как граница: ночует гость до него. */
          const edge = date === from || (to !== '' && date === to);
          const inside = from !== '' && to !== '' && date > from && date < to;

          return (
            <button
              key={date}
              type="button"
              disabled={past || full}
              onClick={() => onPick(date)}
              title={
                past
                  ? undefined
                  : full
                    ? 'всё занято'
                    : last
                      ? 'свободны не все домики'
                      : 'свободно'
              }
              className={`flex aspect-square items-center justify-center rounded-[10px] text-[15px] tabular-nums transition disabled:cursor-not-allowed ${
                edge
                  ? 'bg-aurora text-aurora-ink font-semibold'
                  : inside
                    ? 'bg-aurora/25 text-ink'
                    : past
                      ? 'text-ink-3/40'
                      : full
                        ? 'bg-busy/20 text-busy line-through'
                        : last
                          ? 'bg-amber/20 text-amber cursor-pointer hover:brightness-125'
                          : 'bg-ok/15 text-ink cursor-pointer hover:brightness-125'
              }`}
            >
              {day}
            </button>
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
  /* Выбор гостя: первый клик — заезд, второй — выезд. */
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warning, setWarning] = useState('');
  const { setRange } = usePickedDates();

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

  function isFull(date: string): boolean {
    return houseCount > 0 && (takenPerDay.get(date) ?? 0) >= houseCount;
  }

  /* Клик по дню. Пока выбран только заезд — второй клик закрывает промежуток,
     если внутри нет полностью занятых ночей: заявку на такие даты всё равно
     пришлось бы переносить. */
  function pick(date: string) {
    setWarning('');

    if (from === '' || to !== '' || date <= from) {
      setFrom(date);
      setTo('');
      setRange({ from: date, to: '' });
      return;
    }

    for (let night = from; night < date; night = addDays(night, 1)) {
      if (isFull(night)) {
        setWarning('Внутри этих чисел есть занятые даты — выберите промежуток покороче.');
        return;
      }
    }

    setTo(date);
    setRange({ from, to: date });
    /* Форма — следующий шаг, а стоит она ниже: подводим к ней сами. */
    document.getElementById('request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function reset() {
    setFrom('');
    setTo('');
    setWarning('');
    setRange(null);
  }

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

      {/* Отрицательные поля с обратными отступами: полоса прокрутки идёт от
          края до края карточки, а не внутри её паддингов. */}
      <div className="-mx-4 flex gap-6 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {visible.map((item) => (
          <Month
            key={`${item.year}-${item.month}`}
            year={item.year}
            month={item.month}
            today={today}
            houseCount={houseCount}
            takenPerDay={takenPerDay}
            from={from}
            to={to}
            onPick={pick}
          />
        ))}
      </div>

      {/* Что выбрано — словами, рядом с сеткой: цветная подсветка сама по себе
          не отвечает на вопрос «а сколько это ночей». */}
      {from ? (
        <div className="border-aurora/30 bg-aurora/10 mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] border px-4 py-3">
          <span className="text-[13.5px]">
            {to ? (
              <>
                <b className="tabular-nums">{human(from)}</b> — <b className="tabular-nums">{human(to)}</b>
                <span className="text-ink-2">
                  {' · '}
                  {nightsBetween(from, to)} {nightWord(nightsBetween(from, to))}
                </span>
              </>
            ) : (
              <>
                Заезд <b className="tabular-nums">{human(from)}</b>
                <span className="text-ink-2"> · теперь выберите день выезда</span>
              </>
            )}
          </span>

          {to ? (
            <a
              href="#request"
              className="bg-aurora text-aurora-ink hover:bg-aurora-hi rounded-full px-4 py-2 text-[13px] font-semibold"
            >
              Оставить заявку на эти даты
            </a>
          ) : null}

          <button
            type="button"
            onClick={reset}
            className="text-ink-3 hover:text-ink ml-auto cursor-pointer text-[12.5px]"
          >
            Сбросить
          </button>
        </div>
      ) : (
        <p className="text-ink-3 border-line mt-5 rounded-[12px] border border-dashed px-4 py-3 text-[12.5px]">
          Нажмите день заезда, затем день выезда — даты подставятся в заявку.
        </p>
      )}

      {warning ? (
        <p className="text-amber bg-amber/10 mt-3 rounded-[10px] px-4 py-2.5 text-[12.5px]">
          {warning}
        </p>
      ) : null}

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
