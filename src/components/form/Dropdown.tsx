'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Popover } from './Popover';

/* Свой выпадающий список вместо нативного.

   Нативный список рисует операционная система: он игнорирует тему сайта,
   на Windows остаётся светлым на тёмной странице, а на разных платформах
   выглядит по-разному. Здесь список — обычный HTML, поэтому он одинаковый
   везде и в нашей палитре.

   Сам список всплывает порталом (см. Popover): внутри карточек и панелей
   есть overflow: hidden, и обычный absolute-блок они обрезали.

   Значение уезжает на сервер скрытым полем, так что форма остаётся обычной
   формой и работает через Server Actions без изменений. */

export type Option = {
  value: string;
  label: string;
  /* Подпись справа: например «свободен» или «занят 12–14». Нужна там, где
     выбор зависит от состояния — гость должен видеть его до клика, а не
     узнавать из сообщения после. */
  hint?: string;
  tone?: 'ok' | 'busy';
};

export function Dropdown({
  name,
  options,
  defaultValue,
  value: controlled,
  onChange,
  placeholder = 'Не выбрано',
  required,
  disabled,
  id,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const listId = `${generatedId}-list`;
  const [inner, setInner] = useState(defaultValue ?? '');
  const value = controlled ?? inner;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value);

  function pick(next: string) {
    if (controlled === undefined) setInner(next);
    onChange?.(next);
    setOpen(false);
  }

  /* Открыли список — подсветка встаёт на выбранный пункт и он виден. */
  useEffect(() => {
    if (!open) return;
    const index = options.findIndex((option) => option.value === value);
    const next = index < 0 ? 0 : index;
    setActive(next);
    /* Ждём кадр: список рисуется порталом и на этот момент ещё не в DOM. */
    const frame = requestAnimationFrame(() => {
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, options, value]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = Math.min(Math.max(active + step, 0), options.length - 1);
      setActive(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[active];
      if (option) pick(option.value);
      return;
    }

    if (event.key === 'Tab') setOpen(false);
  }

  return (
    <>
      {/* Значение для формы. required вешаем сюда же, чтобы браузер сам
          не давал отправить форму с пустым обязательным списком. */}
      <input type="hidden" name={name} value={value} required={required} />

      <button
        ref={anchorRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`border-line-2 bg-bg-2 text-ink hover:border-ink-3/60 focus:outline-aurora flex w-full cursor-pointer items-center justify-between gap-3 rounded-[10px] border px-3.5 py-2.5 text-left text-[14.5px] transition focus:border-transparent focus:outline-2 disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? 'border-aurora/60' : ''
        }`}
      >
        <span className={`truncate ${selected ? '' : 'text-ink-3'}`}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          viewBox="0 0 12 8"
          className={`size-3 flex-none transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M1 1.5 6 6.5l5-5" />
        </svg>
      </button>

      <Popover anchorRef={anchorRef} open={open} onClose={() => setOpen(false)}>
        <ul ref={listRef} id={listId} role="listbox">
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  /* mousedown, а не click: click срабатывает после blur,
                     и список успевает закрыться раньше выбора. */
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(option.value);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[8px] px-3 py-2 text-left text-[14px] transition ${
                    index === active ? 'bg-bg-4 text-ink' : 'text-ink-2'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  <span className="flex flex-none items-center gap-2">
                    {option.hint ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                          option.tone === 'busy'
                            ? 'bg-busy/20 text-busy'
                            : option.tone === 'ok'
                              ? 'bg-ok/20 text-ok'
                              : 'text-ink-3'
                        }`}
                      >
                        {option.hint}
                      </span>
                    ) : null}
                    {isSelected ? <span className="text-aurora">✓</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Popover>
    </>
  );
}
