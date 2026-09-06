'use client';

import { useId, useState } from 'react';

/* Числовое поле со своими кнопками шага.

   У нативного input[type=number] стрелки микроскопические, выглядят
   по-разному в каждом браузере, а на телефоне их нет совсем — приходится
   стирать значение и печатать заново. Здесь кнопки крупные и одинаковые
   везде, а само поле остаётся настоящим input, поэтому форма и клавиатура
   работают как обычно. */

export function NumberField({
  name,
  defaultValue,
  value: controlled,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  required,
  id,
  suffix,
}: {
  name: string;
  defaultValue?: number | string | null;
  value?: number;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
  id?: string;
  /* Подпись справа внутри поля: «₽», «чел.» — чтобы не гадать, что вводить. */
  suffix?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const [inner, setInner] = useState(
    defaultValue === null || defaultValue === undefined ? '' : String(defaultValue),
  );
  const text = controlled === undefined ? inner : String(controlled);

  function commit(next: string) {
    if (controlled === undefined) setInner(next);
    onChange?.(next === '' ? null : Number(next));
  }

  function nudge(direction: 1 | -1) {
    const current = text === '' ? (min ?? 0) : Number(text);
    if (!Number.isFinite(current)) return;
    let next = current + direction * step;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    commit(String(next));
  }

  const atMin = min !== undefined && text !== '' && Number(text) <= min;
  const atMax = max !== undefined && text !== '' && Number(text) >= max;

  return (
    <div className="border-line-2 bg-bg-2 focus-within:outline-aurora hover:border-ink-3/60 flex items-stretch overflow-hidden rounded-[10px] border transition focus-within:border-transparent focus-within:outline-2">
      <button
        type="button"
        aria-label="Меньше"
        disabled={atMin}
        onClick={() => nudge(-1)}
        /* Не меньше 44px: палец промахивается по всему, что мельче. */
        className="text-ink-3 hover:bg-bg-4 hover:text-ink flex w-11 flex-none cursor-pointer items-center justify-center text-[18px] leading-none disabled:cursor-not-allowed disabled:opacity-30"
      >
        −
      </button>

      <div className="relative flex-1">
        <input
          id={inputId}
          name={name}
          type="number"
          inputMode="numeric"
          value={text}
          min={min}
          max={max}
          step={step}
          required={required}
          placeholder={placeholder}
          onChange={(event) => commit(event.target.value)}
          className={`no-spin text-ink placeholder:text-ink-3 w-full bg-transparent py-2.5 text-center text-[14.5px] outline-none ${
            suffix ? 'pr-7' : ''
          }`}
        />
        {suffix ? (
          <span className="text-ink-3 pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[13px]">
            {suffix}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="Больше"
        disabled={atMax}
        onClick={() => nudge(1)}
        /* Не меньше 44px: палец промахивается по всему, что мельче. */
        className="text-ink-3 hover:bg-bg-4 hover:text-ink flex w-11 flex-none cursor-pointer items-center justify-center text-[18px] leading-none disabled:cursor-not-allowed disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
