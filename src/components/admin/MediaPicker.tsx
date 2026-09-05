'use client';

import Image from 'next/image';
import { useState } from 'react';
import { mediaUrl } from '@/lib/media-url';

export type MediaOption = { id: string; key: string; alt: string };

function Thumb({ option, size = 44 }: { option: MediaOption; size?: number }) {
  return (
    <Image
      src={mediaUrl(option.key)}
      alt={option.alt}
      width={size}
      height={size}
      className="size-full object-cover"
    />
  );
}

/* Выбор одной картинки. Список открывается по клику и закрывается после выбора —
   отдельная страница медиатеки для этого не нужна. */
export function MediaPicker({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: MediaOption[];
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="bg-bg-2 border-line size-11 flex-none overflow-hidden rounded-[8px] border">
          {selected ? <Thumb option={selected} /> : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-full border px-3 py-1.5 text-[12.5px]"
        >
          {selected ? 'Заменить' : 'Выбрать фото'}
        </button>
        {selected ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-ink-3 hover:text-busy cursor-pointer text-[12.5px]"
          >
            Убрать
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="border-line bg-bg-2 mt-3 max-h-64 overflow-y-auto rounded-[10px] border p-2">
          {options.length === 0 ? (
            <p className="text-ink-3 p-3 text-[13px]">
              Медиатека пуста — загрузите фотографии в разделе «Медиатека».
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  title={option.alt}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className={`aspect-square cursor-pointer overflow-hidden rounded-[8px] border ${
                    option.id === value ? 'border-aurora' : 'border-line'
                  }`}
                >
                  <Thumb option={option} size={120} />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* Выбор нескольких картинок с сохранением порядка: повторный клик убирает. */
export function MediaMultiPicker({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: MediaOption[];
  onChange: (ids: string[]) => void;
}) {
  const chosen = value
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is MediaOption => Boolean(o));

  return (
    <div>
      {chosen.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {chosen.map((option, index) => (
            <div key={option.id} className="relative">
              <div className="border-line size-14 overflow-hidden rounded-[8px] border">
                <Thumb option={option} size={120} />
              </div>
              <div className="mt-1 flex justify-center gap-1">
                <button
                  type="button"
                  aria-label="Левее"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...value];
                    const prev = next[index - 1];
                    const cur = next[index];
                    if (prev === undefined || cur === undefined) return;
                    next[index - 1] = cur;
                    next[index] = prev;
                    onChange(next);
                  }}
                  className="text-ink-3 hover:text-ink cursor-pointer text-[11px] disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Убрать"
                  onClick={() => onChange(value.filter((id) => id !== option.id))}
                  className="text-ink-3 hover:text-busy cursor-pointer text-[11px]"
                >
                  ✕
                </button>
                <button
                  type="button"
                  aria-label="Правее"
                  disabled={index === value.length - 1}
                  onClick={() => {
                    const next = [...value];
                    const after = next[index + 1];
                    const cur = next[index];
                    if (after === undefined || cur === undefined) return;
                    next[index + 1] = cur;
                    next[index] = after;
                    onChange(next);
                  }}
                  className="text-ink-3 hover:text-ink cursor-pointer text-[11px] disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="border-line bg-bg-2 max-h-56 overflow-y-auto rounded-[10px] border p-2">
        {options.length === 0 ? (
          <p className="text-ink-3 p-3 text-[13px]">Медиатека пуста.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {options.map((option) => {
              const active = value.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  title={option.alt}
                  onClick={() =>
                    onChange(active ? value.filter((id) => id !== option.id) : [...value, option.id])
                  }
                  className={`aspect-square cursor-pointer overflow-hidden rounded-[8px] border ${
                    active ? 'border-aurora opacity-60' : 'border-line'
                  }`}
                >
                  <Thumb option={option} size={120} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
