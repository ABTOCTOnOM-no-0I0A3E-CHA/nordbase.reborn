'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { mediaUrl } from '@/lib/media-url';
import { uploadOne } from '@/lib/admin/media-actions';

export type MediaOption = { id: string; key: string; alt: string };

/* Снимок с телефона весит 5–10 МБ, а на сервер уезжает через мобильный
   интернет и чужой прокси: запрос успевает оборваться. Ужимаем в браузере до
   отправки — на сервер идёт полмегабайта вместо десяти, и обработка там та же.

   Если браузер не умеет нужного (старый Safari, отключённый canvas), отдаём
   файл как есть: лучше медленная загрузка, чем никакой. */
const MAX_EDGE = 2560;

async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 1_500_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.86),
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

/* Загрузка прямо из окна выбора. Раньше недостающую фотографию приходилось
   нести в медиатеку в другой вкладке, а несохранённые правки блока при этом
   терялись. Загруженное сразу попадает в список и выбирается. */
function UploadButton({
  label = 'Загрузить фото',
  onUploaded,
}: {
  label?: string;
  onUploaded: (media: MediaOption) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError('');

    /* По одному: так частично удачная загрузка не теряется целиком, а
       владелец видит каждую появившуюся картинку. */
    for (const file of Array.from(files)) {
      const data = new FormData();
      data.set('file', await shrink(file));
      const result = await uploadOne(data);
      if (result.media) onUploaded(result.media);
      else if (result.error) setError(`${file.name}: ${result.error}`);
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => void send(event.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="border-aurora/50 text-aurora hover:bg-aurora/10 cursor-pointer rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition disabled:opacity-50"
      >
        {busy ? 'Загружаем…' : label}
      </button>
      {error ? <span className="text-busy text-[12px]">{error}</span> : null}
    </>
  );
}

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
  /* Только что загруженные — впереди списка: их и искать не надо. */
  const [fresh, setFresh] = useState<MediaOption[]>([]);
  const all = [...fresh, ...options];
  const selected = all.find((o) => o.id === value);

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
        <UploadButton
          label={selected ? 'Загрузить новое' : 'Загрузить фото'}
          onUploaded={(media) => {
            setFresh((list) => [media, ...list]);
            onChange(media.id);
            setOpen(false);
          }}
        />
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
          {all.length === 0 ? (
            <p className="text-ink-3 p-3 text-[13px]">
              Медиатека пуста — нажмите «Загрузить фото».
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {all.map((option) => (
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
  const [fresh, setFresh] = useState<MediaOption[]>([]);
  const all = [...fresh, ...options];

  const chosen = value
    .map((id) => all.find((o) => o.id === id))
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

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <UploadButton
          label="Загрузить в галерею"
          onUploaded={(media) => {
            setFresh((list) => [media, ...list]);
            /* Свежая фотография сразу встаёт в конец галереи: её за этим и
               грузили, а порядок потом двигается стрелками. */
            onChange([...value, media.id]);
          }}
        />
      </div>

      <div className="border-line bg-bg-2 max-h-56 overflow-y-auto rounded-[10px] border p-2">
        {all.length === 0 ? (
          <p className="text-ink-3 p-3 text-[13px]">Медиатека пуста.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {all.map((option) => {
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
