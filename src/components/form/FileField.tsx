'use client';

import { useId, useRef, useState } from 'react';

/* Выбор файлов со своим видом.

   Нативная кнопка «Обзор…» рисуется системой: на разных ОС она разного
   размера, цвета и с разной надписью, и в тёмной теме выглядит инородно.
   Сам input оставляем настоящим — прячем его и открываем кликом по своей
   области, поэтому форма отправляется как обычно, а перетаскивание файлов
   мышью продолжает работать. */

export function FileField({
  name,
  accept,
  multiple,
  required,
  hint,
}: {
  name: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  hint?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  function describe(list: FileList | null) {
    setFiles(list ? [...list].map((file) => file.name) : []);
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        required={required}
        onChange={(event) => describe(event.target.files)}
        className="sr-only"
      />

      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!inputRef.current) return;
          /* Кладём перетащенные файлы в настоящий input — иначе форма
             отправит пустоту, хотя пользователь видит имена файлов. */
          inputRef.current.files = event.dataTransfer.files;
          describe(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-[12px] border border-dashed px-5 py-6 text-center transition ${
          dragging ? 'border-aurora bg-aurora/5' : 'border-line-2 hover:border-ink-3'
        }`}
      >
        <span className="bg-bg-2 text-ink-3 flex size-10 items-center justify-center rounded-full">
          <svg
            viewBox="0 0 24 24"
            className="size-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 16V4M8 8l4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
        </span>
        <span className="text-ink text-[14px] font-semibold">
          Выберите файлы или перетащите сюда
        </span>
        {hint ? <span className="text-ink-3 text-[12px] leading-[1.45]">{hint}</span> : null}
      </label>

      {files.length > 0 ? (
        <ul className="text-ink-2 mt-2 grid gap-1 text-[12.5px]">
          {files.map((file) => (
            <li key={file} className="truncate">
              · {file}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
