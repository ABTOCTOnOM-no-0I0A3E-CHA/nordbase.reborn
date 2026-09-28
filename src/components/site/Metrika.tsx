'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/* Яндекс.Метрика. Подключается, только когда владелец вписал номер счётчика в
   настройках: без номера на страницу не уходит ни одного стороннего скрипта —
   и сайт остаётся быстрым у тех, кто счётчик заводить не стал.

   afterInteractive: счётчик не должен задерживать отрисовку первого экрана. */

declare global {
  interface Window {
    ym?: (id: number, action: string, url?: string, params?: Record<string, unknown>) => void;
  }
}

export function Metrika({ id }: { id: string }) {
  const pathname = usePathname();
  /* Первый показ счётчик засчитывает сам при init — второй хит на него был бы
     двойным просмотром. */
  const counted = useRef(false);

  /* Переходы внутри сайта не перезагружают страницу, а tag.js видит только
     первую. Без досылки хита в отчётах у каждого визита остаётся одна
     страница входа, а «Цены» и карточки домов выглядят непосещаемыми. */
  useEffect(() => {
    if (!id) return;
    if (!counted.current) {
      counted.current = true;
      return;
    }
    window.ym?.(Number(id), 'hit', window.location.href, { referer: document.referrer });
  }, [id, pathname]);

  if (!id) return null;

  return (
    <>
      <Script id="metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${Number(id)}','ym');
        ym(${Number(id)}, 'init', {
          ssr: true,
          webvisor: true,
          clickmap: true,
          trackLinks: true,
          accurateTrackBounce: true
        });`}
      </Script>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${id}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
