import { MetrikaRoutes } from './MetrikaRoutes';

/* Яндекс.Метрика. Подключается, только когда владелец вписал номер счётчика в
   настройках: без номера на страницу не уходит ни одного стороннего скрипта —
   и сайт остаётся быстрым у тех, кто счётчик заводить не стал.

   Тег обычный, а не next/script: тот вставляет код уже после гидратации, и в
   самой разметке остаётся лишь экранированная строка — браузер её не исполняет
   как скрипт, а проверки Метрики и просмотр исходного кода счётчика не находят.
   Сам tag.js грузится с async, поэтому отрисовку первого экрана не задерживает. */
export function Metrika({ id }: { id: string }) {
  const counter = Number(id);
  if (!id || !Number.isFinite(counter) || counter <= 0) return null;

  const snippet = `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${counter}','ym');
ym(${counter}, 'init', {ssr:true, webvisor:true, clickmap:true, trackLinks:true, accurateTrackBounce:true});`;

  return (
    <>
      <script id="metrika" dangerouslySetInnerHTML={{ __html: snippet }} />
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
