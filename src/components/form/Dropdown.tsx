'use client';

import { useEffect, useId, useRef, useState } from 'react';

/* Свой выпадающий список вместо нативного select.

   Нативный список рисует операционная система: он игнорирует тему сайта,
   на Windows остаётся светлым на тёмной странице, а на разных платформах
   выглядит по-разному. Здесь список — обычный HTML, поэтому он одинаковый
   везде и в нашей палитре.

   Значение уезжает на сервер скрытым полем, так что форма остаётся обычной
   формой и работает через Server Actions без изменений. */

export type Option = { value: string; label: string };

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
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value);

  function pick(next: string) {
    if (controlled === undefined) setInner(next);
    onChange?.(next);
    setOpen(false);
  }

  /* Закрываем по клику мимо и по Esc — иначе список остаётся висеть
     поверх страницы и перекрывает соседние поля. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* Открыли список — подсветка встаёт на выбранный пункт и он виден. */
  useEffect(() => {
    if (!open) return;
    const index = options.findIndex((option) => option.value === value);
    setActive(index < 0 ? 0 : index);
    listRef.current?.children[index < 0 ? 0 : index]?.scrollIntoView({ block: 'nearest' });
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
    <div ref={rootRef} className="relative">
      {/* Значение для формы. required вешаем сюда же, чтобы браузер сам
          не давал отправить форму с пустым обязательным списком. */}
      <input type="hidden" name={name} value={value} required={required} />

      <button
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
        <span className={selected ? '' : 'text-ink-3'}>{selected?.label ?? placeholder}</span>
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

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="border-line-2 bg-bg-3 absolute top-full right-0 left-0 z-30 mt-1.5 max-h-64 overflow-y-auto rounded-[10px] border p-1 shadow-[0_12px_28px_rgb(0_0_0/0.45)]"
        >
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
                  {option.label}
                  {isSelected ? <span className="text-aurora">✓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
