'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/* Досылка просмотров при переходах внутри сайта.

   Переходы по ссылкам не перезагружают страницу, а tag.js считает только ту,
   на которую человек зашёл. Без этого у каждого визита в отчётах оставалась бы
   одна страница входа, а «Цены» и карточки домов выглядели бы непосещаемыми. */

declare global {
  interface Window {
    ym?: (id: number, action: string, url?: string, params?: Record<string, unknown>) => void;
  }
}

export function MetrikaRoutes({ id }: { id: number }) {
  const pathname = usePathname();
  /* Первый показ счётчик засчитывает сам при init — второй хит на него был бы
     двойным просмотром. */
  const counted = useRef(false);

  useEffect(() => {
    if (!counted.current) {
      counted.current = true;
      return;
    }
    window.ym?.(id, 'hit', window.location.href, { referer: document.referrer });
  }, [id, pathname]);

  return null;
}
