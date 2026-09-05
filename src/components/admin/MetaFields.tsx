'use client';

import { useState } from 'react';
import { Input } from './ui';

export type MetaRow = { label: string; value: string };

/* Свои характеристики: клиент сам решает, что показать в карточке домика или
   тура — «Wi-Fi: есть», «Мангал: есть». Это заменяет добавление новых полей
   в схему, ради которого обычно и тянут универсальную CMS. */
export function MetaFields({ defaultValue }: { defaultValue: MetaRow[] }) {
  const [rows, setRows] = useState<MetaRow[]>(
    defaultValue.length > 0 ? defaultValue : [{ label: '', value: '' }],
  );

  const update = (index: number, patch: Partial<MetaRow>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="grid gap-2">
      {rows.map((row, index) => (
        <div key={index} className="flex gap-2">
          <Input
            name="metaLabel"
            value={row.label}
            placeholder="Название, например Wi-Fi"
            onChange={(e) => update(index, { label: e.target.value })}
          />
          <Input
            name="metaValue"
            value={row.value}
            placeholder="Значение, например есть"
            onChange={(e) => update(index, { value: e.target.value })}
          />
          <button
            type="button"
            aria-label="Убрать"
            onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
            className="text-ink-3 hover:text-busy cursor-pointer px-2"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { label: '', value: '' }])}
        className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-[10px] border border-dashed py-2 text-[13px]"
      >
        + Характеристика
      </button>
    </div>
  );
}
