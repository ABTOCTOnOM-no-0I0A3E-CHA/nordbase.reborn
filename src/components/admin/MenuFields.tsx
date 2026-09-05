'use client';

import { useState } from 'react';
import { Input } from './ui';

export type MenuItem = { label: string; href: string };

/* Пункты верхнего меню: владелец сам решает, какие разделы показывать и в каком
   порядке, и может повесить пункт на любую созданную им страницу. */
export function MenuFields({ defaultValue }: { defaultValue: MenuItem[] }) {
  const [items, setItems] = useState<MenuItem[]>(defaultValue);

  const update = (index: number, patch: Partial<MenuItem>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const swap = (a: number, b: number) =>
    setItems((prev) => {
      const copy = [...prev];
      const first = copy[a];
      const second = copy[b];
      if (!first || !second) return prev;
      copy[a] = second;
      copy[b] = first;
      return copy;
    });

  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            name="menuLabel"
            value={item.label}
            placeholder="Подпись"
            onChange={(e) => update(index, { label: e.target.value })}
          />
          <Input
            name="menuHref"
            value={item.href}
            placeholder="/rybachiy"
            onChange={(e) => update(index, { href: e.target.value })}
          />
          <button
            type="button"
            aria-label="Выше"
            disabled={index === 0}
            onClick={() => swap(index, index - 1)}
            className="text-ink-3 hover:text-ink cursor-pointer px-1 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Ниже"
            disabled={index === items.length - 1}
            onClick={() => swap(index, index + 1)}
            className="text-ink-3 hover:text-ink cursor-pointer px-1 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            aria-label="Убрать"
            onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
            className="text-ink-3 hover:text-busy cursor-pointer px-1"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, { label: '', href: '/' }])}
        className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-[10px] border border-dashed py-2 text-[13px]"
      >
        + Пункт меню
      </button>
    </div>
  );
}
