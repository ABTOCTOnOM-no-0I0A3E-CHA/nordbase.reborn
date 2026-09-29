'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/* Уведомление о cookie.

   Счётчик посещаемости пишет свои cookie, а значит гостя об этом нужно
   предупредить и дать ссылку на политику. Плашка не блокирует сайт и не
   спрашивает разрешения: в России достаточно информировать, а окно с двумя
   кнопками поверх первого экрана только мешало бы выбирать даты. */

const KEY = 'nb-cookie-notice';

export function CookieNotice() {
  /* Первый кадр рисуем без плашки: на сервере localStorage нет, и разметка
     с плашкой разъехалась бы с тем, что видит вернувшийся гость. */
  const [shown, setShown] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShown(true);
    } catch {
      /* Приватный режим или запрет на хранилище — тогда просто покажем. */
      setShown(true);
    }
  }, []);

  if (!shown) return null;

  function hide() {
    setShown(false);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* Не сохранилось — плашка вернётся в следующий раз, это не поломка. */
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-4">
      <div className="border-line-2 bg-bg-2/95 text-ink-2 pointer-events-auto mx-auto flex max-w-[720px] flex-wrap items-center gap-3 rounded-[14px] border p-4 text-[13px] shadow-[0_18px_40px_rgb(0_0_0/0.45)] backdrop-blur">
        <p className="min-w-[220px] flex-1">
          Сайт использует cookie и Яндекс.Метрику, чтобы понимать, какие страницы полезны гостям.
          Подробнее —{' '}
          <Link href="/policy" className="text-ice underline">
            в политике обработки данных
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={hide}
          className="bg-aurora text-aurora-ink hover:bg-aurora-hi cursor-pointer rounded-full px-4 py-2 text-[13px] font-semibold transition"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
