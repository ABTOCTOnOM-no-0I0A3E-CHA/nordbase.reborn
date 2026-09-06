'use client';

import { useState, useTransition } from 'react';
import {
  BLOCK_LABELS,
  BLOCK_ORDER,
  emptyBlock,
  type Block,
  type BlockType,
} from '@/lib/blocks';
import { BLOCK_FIELDS, BLOCK_HINTS, type FieldDef } from '@/lib/admin/block-fields';
import { MediaMultiPicker, MediaPicker, type MediaOption } from './MediaPicker';
import { Input, Select, Textarea, inputClass } from './ui';

/* Редактор держит массив блоков в состоянии и отправляет его одной кнопкой.
   Так владелец может двигать блоки и править несколько сразу, не теряя правки
   между запросами. Проверку данных делает zod уже на сервере. */

type Item = Record<string, unknown>;

function setPath(block: Block, name: string, value: unknown): Block {
  return { ...block, [name]: value } as Block;
}

function Label({ children, hint }: { children: string; hint?: string }) {
  return (
    <span className="text-ink-3 mb-1.5 block text-[12px] font-semibold">
      {children}
      {hint ? <span className="text-ink-3 block font-normal">{hint}</span> : null}
    </span>
  );
}

function FieldControl({
  field,
  value,
  media,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  media: MediaOption[];
  onChange: (value: unknown) => void;
}) {
  switch (field.kind) {
    case 'text':
      return (
        <Input
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'textarea':
      return (
        <Textarea
          rows={field.rows ?? 3}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          step="any"
          value={typeof value === 'number' ? String(value) : ''}
          onChange={(e) => {
            /* Пустое поле и промежуточный ввод вроде «-» отдаём как undefined:
               JSON.stringify выбросит ключ, и сработает значение по умолчанию
               из схемы. Иначе в тело страницы уезжали 0 и null. */
            const parsed = Number(e.target.value);
            onChange(e.target.value === '' || !Number.isFinite(parsed) ? undefined : parsed);
          }}
        />
      );
    case 'checkbox':
      return (
        <label className="text-ink-2 flex cursor-pointer items-center gap-2 text-[13.5px]">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-aurora size-4"
          />
          {field.label}
        </label>
      );
    case 'select':
      return (
        <Select
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            /* «Колонок» хранится числом, остальные select — строками. */
            onChange(/^\d+$/.test(raw) ? Number(raw) : raw);
          }}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    case 'media':
      return (
        <MediaPicker
          value={typeof value === 'string' ? value : null}
          options={media}
          onChange={onChange}
        />
      );
    case 'mediaList':
      return (
        <MediaMultiPicker
          value={Array.isArray(value) ? (value as string[]) : []}
          options={media}
          onChange={onChange}
        />
      );
    case 'list':
      return <ListField field={field} value={value} media={media} onChange={onChange} />;
  }
}

function ListField({
  field,
  value,
  media,
  onChange,
}: {
  field: Extract<FieldDef, { kind: 'list' }>;
  value: unknown;
  media: MediaOption[];
  onChange: (value: unknown) => void;
}) {
  const items: Item[] = Array.isArray(value) ? (value as Item[]) : [];

  const update = (index: number, name: string, next: unknown) => {
    const copy = items.map((item, i) => (i === index ? { ...item, [name]: next } : item));
    onChange(copy);
  };

  const swap = (a: number, b: number) => {
    const copy = [...items];
    const first = copy[a];
    const second = copy[b];
    if (!first || !second) return;
    copy[a] = second;
    copy[b] = first;
    onChange(copy);
  };

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <div key={index} className="border-line bg-bg-2 rounded-[10px] border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-ink-3 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
              {field.itemLabel} {index + 1}
            </span>
            <span className="flex gap-1">
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
                aria-label="Удалить"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="text-ink-3 hover:text-busy cursor-pointer px-1"
              >
                ✕
              </button>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {field.fields.map((sub) => (
              <div key={sub.name} className={sub.kind === 'textarea' ? 'sm:col-span-2' : ''}>
                {sub.kind !== 'checkbox' ? <Label>{sub.label}</Label> : null}
                <FieldControl
                  field={sub}
                  value={item[sub.name]}
                  media={media}
                  onChange={(next) => update(index, sub.name, next)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          const blank: Item = {};
          for (const sub of field.fields) {
            blank[sub.name] = sub.kind === 'select' ? (sub.options[0]?.value ?? '') : '';
          }
          onChange([...items, blank]);
        }}
        className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-[10px] border border-dashed py-2 text-[13px]"
      >
        + {field.itemLabel}
      </button>
    </div>
  );
}

export function BlockEditor({
  initial,
  media,
  save,
  previewHref,
}: {
  initial: Block[];
  media: MediaOption[];
  save: (json: string) => Promise<void>;
  previewHref?: string;
}) {
  const [blocks, setBlocks] = useState<Block[]>(initial);
  const [adding, setAdding] = useState<BlockType>('text');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (index: number, block: Block) =>
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)));

  const swap = (a: number, b: number) =>
    setBlocks((prev) => {
      const copy = [...prev];
      const first = copy[a];
      const second = copy[b];
      if (!first || !second) return prev;
      copy[a] = second;
      copy[b] = first;
      return copy;
    });

  const toggle = (index: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="grid gap-4">
      {blocks.map((block, index) => {
        const fields = BLOCK_FIELDS[block.type];
        const hint = BLOCK_HINTS[block.type];
        const isCollapsed = collapsed.has(index);

        return (
          <div key={index} className="bg-bg-3 border-line rounded-[14px] border">
            <div className="border-line flex flex-wrap items-center gap-3 border-b px-4 py-3">
              <button
                type="button"
                onClick={() => toggle(index)}
                className="text-ink-3 hover:text-ink cursor-pointer"
                aria-label={isCollapsed ? 'Развернуть' : 'Свернуть'}
              >
                {isCollapsed ? '▸' : '▾'}
              </button>
              <b className="text-[14.5px] font-semibold">{BLOCK_LABELS[block.type]}</b>
              {hint ? <span className="text-ink-3 text-[12px]">{hint}</span> : null}

              <span className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Выше"
                  disabled={index === 0}
                  onClick={() => swap(index, index - 1)}
                  className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-full border px-2.5 py-1 text-[12px] disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Ниже"
                  disabled={index === blocks.length - 1}
                  onClick={() => swap(index, index + 1)}
                  className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-full border px-2.5 py-1 text-[12px] disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Удалить блок со страницы?')) {
                      setBlocks((prev) => prev.filter((_, i) => i !== index));
                    }
                  }}
                  className="border-busy/50 text-busy hover:bg-busy/10 cursor-pointer rounded-full border px-2.5 py-1 text-[12px]"
                >
                  Удалить
                </button>
              </span>
            </div>

            {isCollapsed ? null : (
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                {fields.map((field) => {
                  const wide =
                    field.kind === 'list' ||
                    field.kind === 'mediaList' ||
                    field.kind === 'textarea' ||
                    ('wide' in field && field.wide);
                  return (
                    <div key={field.name} className={wide ? 'sm:col-span-2' : ''}>
                      {field.kind !== 'checkbox' ? (
                        <Label hint={field.kind === 'textarea' ? field.hint : undefined}>
                          {field.label}
                        </Label>
                      ) : null}
                      <FieldControl
                        field={field}
                        value={(block as unknown as Item)[field.name]}
                        media={media}
                        onChange={(next) => update(index, setPath(block, field.name, next))}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="border-line-2 flex flex-wrap items-center gap-3 rounded-[14px] border border-dashed p-4">
        <select
          value={adding}
          onChange={(e) => setAdding(e.target.value as BlockType)}
          className={`${inputClass} select max-w-56`}
        >
          {BLOCK_ORDER.map((type) => (
            <option key={type} value={type}>
              {BLOCK_LABELS[type]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setBlocks((prev) => [...prev, emptyBlock(adding)])}
          className="border-line-2 text-ink hover:border-ink-2 cursor-pointer rounded-full border px-4 py-2 text-[13.5px] font-semibold"
        >
          Добавить блок
        </button>
      </div>

      <div className="border-line bg-bg-2 sticky bottom-0 flex flex-wrap items-center gap-3 rounded-[14px] border p-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setSaved(false);
            setError(null);
            startTransition(async () => {
              /* Без catch любой отказ сервера — истёкшая сессия, отклонённая
                 схема, обрыв связи — выглядел как «ничего не произошло»,
                 и владелец терял правки, не понимая почему. */
              try {
                await save(JSON.stringify(blocks));
                setSaved(true);
              } catch (cause) {
                setError(
                  cause instanceof Error && cause.message
                    ? cause.message
                    : 'Не удалось сохранить. Проверьте связь и попробуйте ещё раз.',
                );
              }
            });
          }}
          className="bg-aurora text-aurora-ink hover:bg-aurora-hi cursor-pointer rounded-full px-5 py-2.5 text-[14px] font-semibold disabled:opacity-60"
        >
          {pending ? 'Сохраняем…' : 'Сохранить страницу'}
        </button>
        {previewHref ? (
          <a
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-2 hover:text-ink text-[13.5px]"
          >
            Посмотреть на сайте ↗
          </a>
        ) : null}
        {saved && !pending ? <span className="text-aurora text-[13.5px]">Сохранено</span> : null}
        {error ? <span className="text-busy text-[13.5px]">{error}</span> : null}
        <span className="text-ink-3 ml-auto text-[12.5px]">Блоков: {blocks.length}</span>
      </div>
    </div>
  );
}
