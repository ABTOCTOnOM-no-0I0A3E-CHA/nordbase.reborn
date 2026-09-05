'use client';

import { useState } from 'react';

/* Виджет Яндекса грузится по клику: чужой скрипт не тянется на каждом заходе
   и не тормозит первую отрисовку. */
export function MapWidget({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const [shown, setShown] = useState(false);
  const src = `https://yandex.ru/map-widget/v1/?ll=${lng}%2C${lat}&z=${zoom}&pt=${lng},${lat},pm2rdm`;

  return (
    <div className="border-line bg-bg-3 overflow-hidden rounded-[16px] border">
      <div className="relative h-[340px]">
        {shown ? (
          <iframe
            src={src}
            title="Карта проезда к базе"
            className="h-full w-full border-0"
            loading="lazy"
          />
        ) : (
          <div className="from-ice/12 absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b to-transparent px-6 text-center">
            <p className="text-ink-2 max-w-[36ch] text-[14.5px]">
              Карта загрузится по клику — так страница открывается быстрее.
            </p>
            <button
              type="button"
              onClick={() => setShown(true)}
              className="border-line-2 hover:border-ink-2 cursor-pointer rounded-full border bg-white/6 px-6 py-3 text-[15px] font-semibold"
            >
              Показать карту
            </button>
          </div>
        )}
      </div>
      <div className="border-line text-ink-3 flex flex-wrap justify-between gap-3 border-t px-5 py-4 text-[13.5px]">
        <span>
          Координаты: {lat}, {lng}
        </span>
        <a
          className="text-ice"
          href={`https://yandex.ru/maps/?pt=${lng},${lat}&z=${zoom}&l=map`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Открыть в Яндекс.Картах
        </a>
      </div>
    </div>
  );
}
