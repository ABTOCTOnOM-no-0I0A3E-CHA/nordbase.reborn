'use client';

/* Что происходит после отправки.

   Раньше форма мгновенно схлопывалась в короткую плашку, страница
   подпрыгивала вверх, и гость не понимал, случилось что-то или сломалось.
   Теперь: форма гаснет на месте, на её месте разворачивается карточка
   с галочкой, и всё это без смены высоты — страница остаётся неподвижной.

   Анимации только на transform и opacity: их браузер считает на видеокарте,
   поэтому на слабом телефоне это не подтормаживает. При включённом
   «уменьшить движение» всё появляется сразу, без движения. */

export function RequestSuccess({
  telegram,
  whatsapp,
  name,
}: {
  telegram: string;
  whatsapp: string;
  name: string;
}) {
  return (
    <div className="request-done border-line bg-bg-3 relative overflow-hidden rounded-[18px] border px-6 py-10 text-center sm:px-10">
      {/* Мягкое свечение за галочкой — тот же зелёный, что у кнопок */}
      <span className="request-done-glow bg-aurora/12 pointer-events-none absolute top-0 left-1/2 size-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px]" />

      <span className="request-done-badge bg-aurora/15 relative mx-auto mb-5 flex size-16 items-center justify-center rounded-full">
        <svg
          viewBox="0 0 24 24"
          className="text-aurora size-8"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path className="request-done-tick" d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>

      <p className="request-done-line request-done-line-1 relative mb-2 text-[22px] font-bold tracking-[-0.02em]">
        {name ? `${name}, заявка отправлена` : 'Заявка отправлена'}
      </p>
      <p className="request-done-line request-done-line-2 text-ink-2 relative mx-auto max-w-[46ch] text-[15px] leading-[1.55]">
        Мы получили её и свяжемся с вами в ближайшее время. Если вопрос срочный — напишите нам
        в мессенджер, там отвечаем быстрее всего.
      </p>

      <div className="request-done-line request-done-line-3 relative mt-6 flex flex-wrap justify-center gap-3">
        <a
          href={telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-aurora text-aurora-ink hover:bg-aurora-hi rounded-full px-6 py-3 text-[15px] font-semibold transition"
        >
          Написать в Telegram
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="border-line-2 text-ink hover:border-ink-2 rounded-full border px-6 py-3 text-[15px] font-semibold transition"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
