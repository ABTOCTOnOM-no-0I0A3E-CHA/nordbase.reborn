'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover } from './Popover';

/* Своё поле даты вместо нативного.

   Нативный input[type=date] показывает дату в формате операционной системы:
   у гостя с английской локалью это mm/dd/yyyy, и «05.10» он прочитает как
   5 октября или как 10 мая — угадать нельзя. Здесь формат всегда дд.мм.гггг,
   а календарь начинается с понедельника, как принято у нас.

   Календарь всплывает порталом (см. Popover): карточки и панели вокруг
   обрезали обычный absolute-блок.

   Наружу отдаём ISO (ГГГГ-ММ-ДД) скрытым полем — сервер получает ровно то,
   что и раньше. */

const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

function isoToHuman(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

function humanToIso(human: string): string {
  const match = human.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return '';
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  /* Проверяем, что дата существует: 31.02 в маску проходит, в календарь нет. */
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? '' : iso;
}

/* Ввод с маской: пользователь печатает только цифры, точки ставим сами. */
function mask(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('.');
}

function startOfMonth(iso: string): { year: number; month: number } {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : new Date();
  return { year: base.getUTCFullYear(), month: base.getUTCMonth() };
}

function makeIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function DateField({
  name,
  value: controlled,
  defaultValue,
  onChange,
  min,
  max,
  id,
  required,
  busy = [],
}: {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  /* Границы в ISO. Раньше дат выбрать нельзя — они гасятся в календаре. */
  min?: string;
  max?: string;
  id?: string;
  required?: boolean;
  /* Занятые даты в ISO. Выбрать их можно — вдруг гость готов подождать или
     договориться, — но видно сразу, что домик на эти числа занят. */
  busy?: string[];
}) {
  const [inner, setInner] = useState(defaultValue ?? '');
  const iso = controlled ?? inner;

  const [text, setText] = useState(isoToHuman(iso));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(iso));
  const anchorRef = useRef<HTMLDivElement>(null);

  /* Значение поменяли снаружи — подтягиваем видимый текст. */
  useEffect(() => {
    setText(isoToHuman(iso));
    if (iso) setView(startOfMonth(iso));
  }, [iso]);

  function commit(next: string) {
    if (controlled === undefined) setInner(next);
    onChange?.(next);
  }

  const busySet = useMemo(() => new Set(busy), [busy]);

  const grid = useMemo(() => {
    const { year, month } = view;
    const first = new Date(Date.UTC(year, month, 1));
    /* getUTCDay: 0 — воскресенье. Сдвигаем, чтобы неделя начиналась с понедельника. */
    const lead = (first.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return { lead, days, year, month };
  }, [view]);

  return (
    <>
      <input type="hidden" name={name} value={iso} required={required} />

      <div ref={anchorRef} className="relative">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="дд.мм.гггг"
          value={text}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const masked = mask(event.target.value);
            setText(masked);
            /* Пустое поле — это «дата не выбрана», а не ошибка ввода. */
            if (masked === '') commit('');
            else {
              const next = humanToIso(masked);
              if (next) commit(next);
            }
          }}
          className="border-line-2 bg-bg-2 text-ink placeholder:text-ink-3 hover:border-ink-3/60 focus:outline-aurora w-full rounded-[10px] border py-2.5 pr-10 pl-3.5 text-[14.5px] transition focus:border-transparent focus:outline-2"
        />
        <button
          type="button"
          aria-label="Открыть календарь"
          onClick={() => setOpen((v) => !v)}
          className="text-ink-3 hover:text-ink absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer p-1"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16v13H4zM4 11h16M9 4v4M15 4v4" />
          </svg>
        </button>
      </div>

      <Popover
        anchorRef={anchorRef}
        open={open}
        onClose={() => setOpen(false)}
        matchWidth={false}
        width={296}
        maxHeight={360}
      >
        <div className="p-2">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Предыдущий месяц"
              onClick={() =>
                setView(({ year, month }) =>
                  month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
                )
              }
              className="text-ink-3 hover:bg-bg-2 hover:text-ink cursor-pointer rounded-[8px] px-2.5 py-1"
            >
              ←
            </button>
            <b className="text-[13.5px] font-semibold">
              {MONTHS[view.month]} {view.year}
            </b>
            <button
              type="button"
              aria-label="Следующий месяц"
              onClick={() =>
                setView(({ year, month }) =>
                  month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
                )
              }
              className="text-ink-3 hover:bg-bg-2 hover:text-ink cursor-pointer rounded-[8px] px-2.5 py-1"
            >
              →
            </button>
          </div>

          <div className="text-ink-3 mb-1 grid grid-cols-7 gap-1 text-center text-[11px]">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: grid.lead }, (_, i) => (
              <span key={`lead-${i}`} />
            ))}
            {Array.from({ length: grid.days }, (_, i) => {
              const dayIso = makeIso(grid.year, grid.month, i + 1);
              const disabled = (min && dayIso < min) || (max && dayIso > max);
              const selected = dayIso === iso;
              const taken = busySet.has(dayIso);
              return (
                <button
                  key={dayIso}
                  type="button"
                  disabled={Boolean(disabled)}
                  onClick={() => {
                    commit(dayIso);
                    setOpen(false);
                  }}
                  title={taken ? 'занято' : undefined}
                  className={`aspect-square cursor-pointer rounded-[8px] text-[13px] transition disabled:cursor-not-allowed disabled:opacity-25 ${
                    selected
                      ? 'bg-aurora text-aurora-ink font-semibold'
                      : taken
                        ? 'bg-busy/20 text-busy'
                        : 'bg-ok/10 text-ink-2 hover:bg-bg-4 hover:text-ink'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {busy.length > 0 ? (
            <div className="text-ink-3 border-line mt-2 flex items-center gap-4 border-t pt-2 text-[11.5px]">
              <span className="flex items-center gap-1.5">
                <span className="bg-ok/25 size-2.5 rounded-[3px]" /> свободно
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-busy/40 size-2.5 rounded-[3px]" /> занято
              </span>
            </div>
          ) : null}

          {iso ? (
            <button
              type="button"
              onClick={() => {
                commit('');
                setText('');
                setOpen(false);
              }}
              className="text-ink-3 hover:text-ink border-line mt-2 w-full cursor-pointer border-t pt-2 text-[12.5px]"
            >
              Очистить
            </button>
          ) : null}
        </div>
      </Popover>
    </>
  );
}
