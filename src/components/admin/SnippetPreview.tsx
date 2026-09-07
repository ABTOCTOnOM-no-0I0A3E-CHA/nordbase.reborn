'use client';

import { useState } from 'react';

/* Заголовок и описание для поиска владелец пишет вслепую: поля выглядят как
   любые другие, а результат виден только в выдаче, через недели после
   переобхода. Здесь он сразу видит будущий сниппет и предупреждение о длине.

   Границы — не догма, а то, после чего Яндекс и Google начинают обрезать:
   примерно 60 знаков у заголовка и 160 у описания. Поэтому это подсказка,
   а не запрет: длинный заголовок иногда оправдан. */

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

function Counter({ value, limit }: { value: number; limit: number }) {
  const over = value > limit;
  const empty = value === 0;

  return (
    <span
      className={`text-[11.5px] tabular-nums ${
        empty ? 'text-ink-3' : over ? 'text-amber font-semibold' : 'text-ok'
      }`}
    >
      {value} / {limit}
      {over ? ' — обрежется' : ''}
    </span>
  );
}

export function SnippetPreview({
  siteName,
  path,
  titleName,
  descriptionName,
  defaultTitle,
  defaultDescription,
  fallbackTitle,
}: {
  siteName: string;
  path: string;
  /* Имена полей формы, за которыми следим. */
  titleName: string;
  descriptionName: string;
  defaultTitle: string;
  defaultDescription: string;
  /* Название страницы: его берут в заголовок, если поле для поиска пустое. */
  fallbackTitle: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);

  const shownTitle = (title || fallbackTitle).trim();
  /* Название базы дописывается автоматически — но только если его нет в самом
     заголовке. Здесь то же правило, что и на сайте, иначе предпросмотр врёт. */
  const full = !shownTitle
    ? siteName
    : shownTitle.toLowerCase().includes(siteName.toLowerCase())
      ? shownTitle
      : `${shownTitle} — ${siteName}`;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-ink-3 mb-2 flex items-center justify-between text-[12.5px] font-semibold">
            Заголовок для поиска
            <Counter value={title.length} limit={TITLE_LIMIT} />
          </span>
          <input
            name={titleName}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={fallbackTitle}
            className="border-line-2 bg-bg-2 text-ink placeholder:text-ink-3 focus:outline-aurora w-full rounded-[10px] border px-3.5 py-2.5 text-[14.5px] transition focus:border-transparent focus:outline-2"
          />
        </label>

        <label className="block">
          <span className="text-ink-3 mb-2 flex items-center justify-between text-[12.5px] font-semibold">
            Описание для поиска
            <Counter value={description.length} limit={DESCRIPTION_LIMIT} />
          </span>
          <textarea
            name={descriptionName}
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="border-line-2 bg-bg-2 text-ink placeholder:text-ink-3 focus:outline-aurora w-full rounded-[10px] border px-3.5 py-2.5 text-[14.5px] transition focus:border-transparent focus:outline-2"
          />
        </label>
      </div>

      {/* Сам сниппет: пропорции и обрезка примерно как в выдаче. */}
      <div className="border-line bg-bg-2 rounded-[12px] border p-4">
        <span className="text-ink-3 mb-2 block text-[11px] tracking-[0.06em] uppercase">
          Так увидят в поиске
        </span>
        <div className="max-w-[600px]">
          <span className="text-ink-3 block text-[12.5px]">
            nordbase.ru{path === '/' ? '' : path}
          </span>
          <b className="text-ice block text-[17px] leading-[1.3] font-normal">
            {full.length > 70 ? `${full.slice(0, 70)}…` : full}
          </b>
          <p className="text-ink-2 mt-1 text-[13px] leading-[1.45]">
            {description
              ? description.length > DESCRIPTION_LIMIT
                ? `${description.slice(0, DESCRIPTION_LIMIT)}…`
                : description
              : 'Описание не заполнено — поисковик возьмёт кусок текста со страницы сам, и это редко получается удачно.'}
          </p>
        </div>
      </div>
    </div>
  );
}
