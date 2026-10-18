'use client';

import { useEffect, useState } from 'react';

/* Расчёт стоимости прямо в форме.

   Раньше гость отправлял заявку, не понимая, во сколько ему это встанет, и
   узнавал сумму только в ответном звонке. Половина отваливалась именно там.
   Здесь он видит, из чего складывается цена, пока заполняет поля.

   Баня намеренно без суммы: её стоимость и время решаются на месте — так
   попросила владелица, и придумывать за неё цифру нельзя. */

const money = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

function nightWord(count: number): string {
  const tail = count % 10;
  const teen = count % 100 >= 11 && count % 100 <= 14;
  if (!teen && tail === 1) return 'ночь';
  if (!teen && tail >= 2 && tail <= 4) return 'ночи';
  return 'ночей';
}

function guestWord(count: number): string {
  const tail = count % 10;
  const teen = count % 100 >= 11 && count % 100 <= 14;
  if (!teen && tail === 1) return 'гостя';
  return 'гостей';
}

function dayWord(count: number): string {
  const tail = count % 10;
  const teen = count % 100 >= 11 && count % 100 <= 14;
  if (!teen && tail === 1) return 'день';
  if (!teen && tail >= 2 && tail <= 4) return 'дня';
  return 'дней';
}

/* Число «доезжает» до нового значения — так видно, что сумма изменилась
   именно от того поля, которое только что тронули. */
function useCountUp(value: number): number {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const from = shown;
    if (from === value) return;

    const start = performance.now();
    const duration = 420;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      /* Замедление к концу: резкая остановка выглядит как сбой. */
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(from + (value - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    /* shown намеренно не в зависимостях: иначе анимация перезапускала бы сама
       себя на каждом кадре. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return shown;
}

export type StayPricing = {
  title: string;
  pricePerNight: number | null;
  minGuests: number;
  capacity: number;
};

export type TourPricing = {
  title: string;
  days: number;
  price: number | null;
  priceUnit: 'group' | 'person';
};

export function PriceSummary({
  stay,
  tour,
  guests,
  nights,
  meals,
  banya,
  mealsPrice,
  prepayPercent,
}: {
  stay: StayPricing | null;
  tour: TourPricing | null;
  guests: number;
  nights: number;
  meals: boolean;
  banya: boolean;
  /* Цена питания за человека в день. */
  mealsPrice: number;
  prepayPercent: number;
}) {
  /* Тур считается по дням: цена за день умножается на длительность, а если
     она указана с человека — ещё и на число гостей. Проживание и тур
     независимы: можно взять только тур, только домик или и то и другое. */
  const tourTotal =
    tour?.price && guests > 0
      ? tour.price * tour.days * (tour.priceUnit === 'person' ? guests : 1)
      : 0;

  const hasStay = Boolean(stay?.pricePerNight) && nights > 0 && guests > 0;
  const canCount = hasStay || tourTotal > 0;

  const stayTotal = hasStay ? (stay?.pricePerNight ?? 0) * guests * nights : 0;
  const mealsTotal = hasStay && meals ? mealsPrice * guests * nights : 0;
  const total = stayTotal + mealsTotal + tourTotal;
  const prepay = Math.round((total * prepayPercent) / 100);

  const shownTotal = useCountUp(total);
  const shownPrepay = useCountUp(prepay);

  if (!canCount) {
    return (
      <div className="border-line bg-bg-3 rounded-[14px] border border-dashed px-4 py-3.5">
        <p className="text-ink-3 text-[13px] leading-[1.5]">
          Выберите домик и даты — покажем стоимость и размер предоплаты до отправки заявки.
        </p>
      </div>
    );
  }

  return (
    <div className="border-aurora/35 bg-aurora/8 request-total rounded-[14px] border px-4 py-4">
      <dl className="grid gap-2 text-[13.5px]">
        {hasStay ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-ink-2">
              Проживание · {guests} {guestWord(guests)} × {nights} {nightWord(nights)}
            </dt>
            <dd className="tabular-nums">{money(stayTotal)}</dd>
          </div>
        ) : null}

        {tourTotal > 0 && tour ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-ink-2">
              {tour.title} · {tour.days} {dayWord(tour.days)} × {money(tour.price ?? 0)}
              {tour.priceUnit === 'person' ? ` × ${guests} ${guestWord(guests)}` : ''}
            </dt>
            <dd className="tabular-nums">{money(tourTotal)}</dd>
          </div>
        ) : null}

        {meals ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-ink-2">
              Питание · {money(mealsPrice)} с человека в день
            </dt>
            <dd className="tabular-nums">{money(mealsTotal)}</dd>
          </div>
        ) : null}

        {banya ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-ink-2">Баня</dt>
            <dd className="text-ink-3 text-[12.5px]">оплачивается на месте</dd>
          </div>
        ) : null}

        <div className="border-line mt-1 flex flex-wrap items-baseline justify-between gap-2 border-t pt-2.5">
          <dt className="font-semibold">Итого</dt>
          <dd className="text-[19px] font-bold tabular-nums">{money(shownTotal)}</dd>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-aurora font-semibold">Предоплата {prepayPercent}%</dt>
          <dd className="text-aurora font-semibold tabular-nums">{money(shownPrepay)}</dd>
        </div>
      </dl>

      <p className="text-ink-3 mt-3 text-[12px] leading-[1.5]">
        Даты закрепляются за вами после предоплаты. Отмена с возвратом — не позднее чем за две
        недели до заезда, позже предоплата не возвращается. Заявка ни к чему не обязывает: сначала
        мы созвонимся и всё подтвердим.
      </p>
    </div>
  );
}
