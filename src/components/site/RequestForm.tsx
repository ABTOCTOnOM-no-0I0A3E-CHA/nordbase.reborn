'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useFormAction } from '@/lib/use-form-action';
import { Dropdown } from '@/components/form/Dropdown';
import { DateField } from '@/components/form/DateField';
import { RequestSuccess } from './RequestSuccess';
import { usePickedDates } from './PickedDates';
import { submitRequest, type RequestState } from '@/lib/request-actions';
import { PriceSummary } from './PriceSummary';
import { CONTACT_HINTS, CONTACT_OPTIONS, type ContactKind } from '@/lib/contact';
import type { HouseRecord, TourRecord } from '@/lib/site-data';

const initial: RequestState = { ok: false };

const field =
  'w-full rounded-[10px] border border-line-2 bg-bg-3 px-3 py-3 text-[15px] text-ink focus:border-transparent focus:outline-2 focus:outline-aurora';
const label = 'mb-2 block text-[12.5px] font-semibold text-ink-3';

/* Ночи между заездом и выездом: день выезда домик уже не занимает. */
function nights(from: string, to: string): string[] {
  if (!from || !to || to <= from) return [];
  const out: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor < end) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function RequestForm({
  houses,
  tours,
  busyByHouse = {},
  today,
  directions,
  submitLabel,
  telegram,
  whatsapp,
  mealsPrice,
  prepayPercent,
}: {
  houses: Pick<HouseRecord, 'id' | 'title' | 'capacity' | 'minGuests' | 'pricePerNight' | 'kind'>[];
  tours: Pick<TourRecord, 'id' | 'title'>[];
  busyByHouse?: Record<string, string[]>;
  /* Варианты «Куда едете» и надпись на кнопке правятся в настройках сайта. */
  directions: string[];
  submitLabel: string;
  /* Ссылки на мессенджеры показываем на карточке «отправлено». */
  telegram: string;
  whatsapp: string;
  /* «Сегодня» считает сервер по часовому поясу базы: у гостя в браузере
     может стоять любая зона, и минимальная дата уехала бы на сутки. */
  today: string;
  /* Цена питания за человека в день и размер предоплаты — из настроек. */
  mealsPrice: number;
  prepayPercent: number;
}) {
  const wrapRef = useRef<HTMLFormElement>(null);
  /* Высоту формы запоминаем до того, как она исчезнет: карточка «отправлено»
     занимает то же место, и страница не прыгает вверх. */
  const [holdHeight, setHoldHeight] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);

  const { state, pending, onSubmit } = useFormAction(submitRequest, initial, {
    onSuccess: (next) => {
      if (!next.ok) return;
      setHoldHeight(wrapRef.current?.offsetHeight ?? null);
      setLeaving(true);
    },
  });

  /* Форма гаснет, и только потом на её месте появляется карточка. */
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setDone(true), 320);
    return () => clearTimeout(timer);
  }, [leaving]);

  const [name, setName] = useState('');
  const [guests, setGuests] = useState(2);
  const [houseId, setHouseId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [meals, setMeals] = useState(false);
  const [banya, setBanya] = useState(false);
  const [contactKind, setContactKind] = useState<ContactKind>('phone');

  /* Даты, выбранные в календаре занятости выше: гость кликает по числам, а
     заполняются эти поля — иначе выбор в календаре ничего бы не делал. */
  const { range } = usePickedDates();

  useEffect(() => {
    /* «Сбросить» в календаре очищает и поля: иначе кнопка обманывает — выбор
       снят, а даты в заявке остались прежними. */
    setDateFrom(range?.from ?? '');
    setDateTo(range?.to ?? '');
  }, [range]);

  const stay = houses.find((house) => house.id === houseId) ?? null;
  /* Дом 1 сдают только от пяти человек. Сказать об этом надо до отправки,
     иначе гость узнает отказ уже в ответном звонке. */
  const belowMin = stay ? guests < stay.minGuests : false;
  const overCapacity = stay ? guests > stay.capacity : false;

  /* Предупреждаем сразу, а не после отправки: занятые даты видны гостю,
     и он не тратит время на заявку, которую всё равно придётся переносить. */
  const wanted = nights(dateFrom, dateTo);
  const busy = houseId ? (busyByHouse[houseId] ?? []) : [];
  const clash = wanted.filter((date) => busy.includes(date));

  /* Домиков несколько, и в пик заняты бывают все сразу. Если конкретный домик
     не выбран, проверяем, остаётся ли хоть один свободный на все выбранные
     ночи — иначе гость увидит «всё свободно» там, где мест нет. */
  const anyFree =
    wanted.length === 0 ||
    houses.some((house) => {
      const taken = busyByHouse[house.id] ?? [];
      return wanted.every((date) => !taken.includes(date));
    });

  /* Состояние каждого объекта на выбранные даты. Раньше гость выбирал домик
     вслепую и только потом читал, что тот занят; теперь занятость видна прямо
     в списке, а свободные стоят выше — выбирать не из чего гадать. */
  const stayOptions = (() => {
    const decorated = houses.map((house) => {
      const taken = busyByHouse[house.id] ?? [];
      const busyNights = wanted.filter((date) => taken.includes(date));
      const free = busyNights.length === 0;

      const size =
        house.minGuests > 1
          ? `${house.title} · до ${house.capacity} мест, от ${house.minGuests}`
          : `${house.title} · до ${house.capacity} мест`;

      return {
        value: house.id,
        label: size,
        /* Пока даты не выбраны, говорить о занятости нечего. */
        hint: wanted.length === 0 ? undefined : free ? 'свободен' : 'занят',
        tone: wanted.length === 0 ? undefined : free ? ('ok' as const) : ('busy' as const),
        free,
      };
    });

    /* Свободные сверху, но порядок внутри групп прежний — владелец задаёт его
       сам, и ломать его сортировкой по алфавиту незачем. */
    const sorted =
      wanted.length === 0
        ? decorated
        : [...decorated.filter((o) => o.free), ...decorated.filter((o) => !o.free)];

    return [{ value: '', label: 'Не выбран' }, ...sorted];
  })();

  if (done) {
    return (
      <div style={holdHeight ? { minHeight: holdHeight } : undefined} className="flex items-center">
        <div className="w-full">
          <RequestSuccess telegram={telegram} whatsapp={whatsapp} name={name.trim().split(' ')[0] ?? ''} />
        </div>
      </div>
    );
  }

  return (
    <form
      ref={wrapRef}
      onSubmit={onSubmit}
      className={`grid gap-4 md:grid-cols-2 ${leaving ? 'request-sending' : ''}`}
    >
      <div className="md:col-span-2">
        <label className={label} htmlFor="direction">
          Куда едете
        </label>
        <Dropdown
          id="direction"
          name="direction"
          defaultValue={directions[0] ?? ''}
          options={directions.map((direction) => ({ value: direction, label: direction }))}
        />
      </div>

      {tours.length > 0 ? (
        <div>
          <label className={label} htmlFor="tourId">
            Тур
          </label>
          <Dropdown
            id="tourId"
            name="tourId"
            placeholder="Не выбран"
            options={[
              { value: '', label: 'Не выбран' },
              ...tours.map((tour) => ({ value: tour.id, label: tour.title })),
            ]}
          />
        </div>
      ) : null}

      {houses.length > 0 ? (
        <div>
          <label className={label} htmlFor="houseId">
            Домик
          </label>
          <Dropdown
            id="houseId"
            name="houseId"
            value={houseId}
            onChange={setHouseId}
            placeholder="Не выбран"
            options={stayOptions}
          />
          {/* Пока дат нет, занятость показать нечем — так и говорим, вместо
              того чтобы молчать и ждать, пока гость выберет вслепую. */}
          {wanted.length === 0 ? (
            <p className="text-ink-3 mt-2 text-[12.5px]">
              Укажите даты — покажем, какие домики на них свободны.
            </p>
          ) : stay ? (
            <p className="mt-2 text-[12.5px]">
              <span className={clash.length > 0 ? 'text-busy' : 'text-ok'}>
                {clash.length > 0 ? 'На эти даты занят' : 'Свободен на эти даты'}
              </span>
              {stay.pricePerNight ? (
                <span className="text-ink-3">
                  {' · '}
                  {stay.pricePerNight.toLocaleString('ru-RU')} ₽ с человека в сутки
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-ink-3 mt-2 text-[12.5px]">
              Свободные на эти даты — в начале списка.
            </p>
          )}
        </div>
      ) : null}

      <div>
        <label className={label} htmlFor="dateFrom">
          Заезд
        </label>
        <DateField
          id="dateFrom"
          name="dateFrom"
          min={today}
          value={dateFrom}
          onChange={setDateFrom}
          busy={busy}
        />
      </div>

      <div>
        <label className={label} htmlFor="dateTo">
          Выезд
        </label>
        <DateField
          id="dateTo"
          name="dateTo"
          min={dateFrom || today}
          value={dateTo}
          onChange={setDateTo}
          busy={busy}
        />
      </div>

      {belowMin ? (
        <p className="text-amber bg-amber/10 rounded-[10px] px-4 py-3 text-[13.5px] md:col-span-2">
          {stay?.title} сдаётся от {stay?.minGuests} человек. Выберите домик поменьше или укажите
          больше гостей — заявку можно оставить в любом случае, обсудим.
        </p>
      ) : overCapacity ? (
        <p className="text-amber bg-amber/10 rounded-[10px] px-4 py-3 text-[13.5px] md:col-span-2">
          В {stay?.title} помещается {stay?.capacity} человек. На большую компанию возьмём два
          объекта — напишите об этом в комментарии.
        </p>
      ) : null}

      {clash.length > 0 ? (
        <p className="text-busy bg-busy/10 rounded-[10px] px-4 py-3 text-[13.5px] md:col-span-2">
          Выбранный домик занят{' '}
          {clash.length === 1 ? 'на дату' : `на ${clash.length} из выбранных дат`}. Заявку оставить
          можно — предложим свободные даты или другой домик.
        </p>
      ) : !anyFree ? (
        <p className="text-amber bg-amber/10 rounded-[10px] px-4 py-3 text-[13.5px] md:col-span-2">
          На эти даты заняты все домики. Оставьте заявку — подскажем ближайшие свободные числа.
        </p>
      ) : null}

      <div>
        <label className={label} htmlFor="guests">
          Гостей
        </label>
        <div className="border-line-2 flex h-12 w-[160px] overflow-hidden rounded-[10px] border">
          <button
            type="button"
            aria-label="Меньше гостей"
            onClick={() => setGuests((n) => Math.max(1, n - 1))}
            className="bg-bg-3 hover:bg-bg-4 flex w-11 cursor-pointer items-center justify-center text-[17px]"
          >
            −
          </button>
          <output className="flex flex-1 items-center justify-center text-[15px]">{guests}</output>
          <button
            type="button"
            aria-label="Больше гостей"
            onClick={() => setGuests((n) => Math.min(20, n + 1))}
            className="bg-bg-3 hover:bg-bg-4 flex w-11 cursor-pointer items-center justify-center text-[17px]"
          >
            +
          </button>
        </div>
        <input type="hidden" name="guests" value={guests} />
      </div>

      {/* Обе услуги платные, и это должно быть видно до отправки заявки. */}
      <div className="grid content-end gap-2 pb-1">
        <label className="text-ink-2 flex cursor-pointer items-start gap-2 text-[14.5px]">
          <input
            type="checkbox"
            name="meals"
            className="check mt-0.5"
            checked={meals}
            onChange={(event) => setMeals(event.target.checked)}
          />
          <span>
            Питание
            <span className="text-ink-3 block text-[12.5px]">
              {mealsPrice.toLocaleString('ru-RU')} ₽ с человека в день, по предзаказу
            </span>
          </span>
        </label>
        <label className="text-ink-2 flex cursor-pointer items-start gap-2 text-[14.5px]">
          <input
            type="checkbox"
            name="banya"
            className="check mt-0.5"
            checked={banya}
            onChange={(event) => setBanya(event.target.checked)}
          />
          <span>
            Баня
            <span className="text-ink-3 block text-[12.5px]">
              платно, стоимость и время обсуждаем на месте
            </span>
          </span>
        </label>
      </div>

      <div>
        <label className={label} htmlFor="name">
          Имя
        </label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          className={field}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div>
        <label className={label} htmlFor="phone">
          Телефон
        </label>
        <input
          id="phone"
          name="phone"
          required
          type="tel"
          inputMode="tel"
          placeholder="+7 900 000-00-00"
          className={field}
          autoComplete="tel"
        />
      </div>

      <div>
        <label className={label} htmlFor="contactKind">
          Как удобнее связаться
        </label>
        <Dropdown
          id="contactKind"
          name="contactKind"
          value={contactKind}
          onChange={(value) => setContactKind(value as ContactKind)}
          options={CONTACT_OPTIONS}
        />
      </div>

      {contactKind !== 'phone' ? (
        <div>
          <label className={label} htmlFor="contactValue">
            Ник или номер в {CONTACT_OPTIONS.find((o) => o.value === contactKind)?.label}
          </label>
          <input
            id="contactValue"
            name="contactValue"
            className={field}
            placeholder={CONTACT_HINTS[contactKind]}
            autoComplete="off"
          />
        </div>
      ) : (
        <input type="hidden" name="contactValue" value="" />
      )}

      <div className="md:col-span-2">
        <label className={label} htmlFor="comment">
          Комментарий
        </label>
        <textarea id="comment" name="comment" rows={3} className={`${field} resize-y`} />
      </div>

      <div className="md:col-span-2">
        <PriceSummary
          stay={
            stay
              ? {
                  title: stay.title,
                  pricePerNight: stay.pricePerNight,
                  minGuests: stay.minGuests,
                  capacity: stay.capacity,
                }
              : null
          }
          guests={guests}
          nights={wanted.length}
          meals={meals}
          banya={banya}
          mealsPrice={mealsPrice}
          prepayPercent={prepayPercent}
        />
      </div>

      <label className="text-ink-3 flex cursor-pointer items-start gap-3 text-[13px] md:col-span-2">
        <input type="checkbox" name="consent" required className="check mt-0.5" />
        <span>
          Согласен на обработку персональных данных в соответствии с{' '}
          <Link href="/policy" className="text-ice underline">
            политикой
          </Link>
          .
        </span>
      </label>

      {state.error ? <p className="text-busy text-sm md:col-span-2">{state.error}</p> : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending || leaving}
          /* На телефоне кнопка во всю ширину: она последняя в форме и в неё
             целятся большим пальцем одной рукой. */
          className="bg-aurora text-aurora-ink hover:bg-aurora-hi w-full cursor-pointer rounded-full px-7 py-3.5 font-semibold disabled:opacity-60 sm:w-auto sm:py-3"
        >
          {pending || leaving ? 'Отправляем…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
