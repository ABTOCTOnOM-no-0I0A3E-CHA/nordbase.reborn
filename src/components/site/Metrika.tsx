import Script from 'next/script';
import { MetrikaRoutes } from './MetrikaRoutes';

/* Яндекс.Метрика. Подключается, только когда владелец вписал номер счётчика в
   настройках: без номера на страницу не уходит ни одного стороннего скрипта —
   и сайт остаётся быстрым у тех, кто счётчик заводить не стал.

   Код счётчика остаётся в разметке страницы, а не вставляется после гидратации:
   так его видит и «проверить счётчик» в Метрике, и просмотр исходного кода.

   afterInteractive: счётчик не должен задерживать отрисовку первого экрана. */
export function Metrika({ id }: { id: string }) {
  const counter = Number(id);
  if (!id || !Number.isFinite(counter) || counter <= 0) return null;

  return (
    <>
      <Script id="metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${counter}','ym');
        ym(${counter}, 'init', {
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
            src={`https://mc.yandex.ru/watch/${counter}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
      <MetrikaRoutes id={counter} />
    </>
  );
}
