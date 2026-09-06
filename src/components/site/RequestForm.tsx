'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useFormAction } from '@/lib/use-form-action';
import { Dropdown } from '@/components/form/Dropdown';
import { DateField } from '@/components/form/DateField';
import { RequestSuccess } from './RequestSuccess';
import { submitRequest, type RequestState } from '@/lib/request-actions';
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
}: {
  houses: Pick<HouseRecord, 'id' | 'title'>[];
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

  /* Предупреждаем сразу, а не после отправки: занятые даты видны гостю,
     и он не тратит время на заявку, которую всё равно придётся переносить. */
  const busy = houseId ? (busyByHouse[houseId] ?? []) : [];
  const clash = nights(dateFrom, dateTo).filter((date) => busy.includes(date));

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
            options={[
              { value: '', label: 'Не выбран' },
              ...houses.map((house) => ({ value: house.id, label: house.title })),
            ]}
          />
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
        />
      </div>

      {clash.length > 0 ? (
        <p className="text-busy bg-busy/10 rounded-[10px] px-4 py-3 text-[13.5px] md:col-span-2">
          Выбранный домик занят{' '}
          {clash.length === 1 ? 'на дату' : `на ${clash.length} из выбранных дат`}. Заявку оставить
          можно — предложим свободные даты или другой домик.
        </p>
      ) : null}

      <div>
        <label className={label} htmlFor="guests">
          Гостей
        </label>
        <div className="border-line-2 flex w-[146px] overflow-hidden rounded-[10px] border">
          <button
            type="button"
            aria-label="Меньше гостей"
            onClick={() => setGuests((n) => Math.max(1, n - 1))}
            className="bg-bg-3 hover:bg-bg-4 w-10 cursor-pointer text-[17px]"
          >
            −
          </button>
          <output className="flex flex-1 items-center justify-center text-[15px]">{guests}</output>
          <button
            type="button"
            aria-label="Больше гостей"
            onClick={() => setGuests((n) => Math.min(20, n + 1))}
            className="bg-bg-3 hover:bg-bg-4 w-10 cursor-pointer text-[17px]"
          >
            +
          </button>
        </div>
        <input type="hidden" name="guests" value={guests} />
      </div>

      <div className="flex items-end gap-6 pb-3">
        <label className="text-ink-2 flex cursor-pointer items-center gap-2 text-[14.5px]">
          <input type="checkbox" name="meals" className="accent-aurora size-4" /> Питание
        </label>
        <label className="text-ink-2 flex cursor-pointer items-center gap-2 text-[14.5px]">
          <input type="checkbox" name="banya" className="accent-aurora size-4" /> Баня
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

      <div className="md:col-span-2">
        <label className={label} htmlFor="comment">
          Комментарий
        </label>
        <textarea id="comment" name="comment" rows={3} className={`${field} resize-y`} />
      </div>

      <label className="text-ink-3 flex cursor-pointer items-start gap-3 text-[13px] md:col-span-2">
        <input type="checkbox" name="consent" required className="accent-aurora mt-0.5 size-4" />
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
          className="bg-aurora text-aurora-ink hover:bg-aurora-hi cursor-pointer rounded-full px-7 py-3 font-semibold disabled:opacity-60"
        >
          {pending || leaving ? 'Отправляем…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
