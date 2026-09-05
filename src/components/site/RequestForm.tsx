'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { submitRequest, type RequestState } from '@/lib/request-actions';
import type { HouseRecord, TourRecord } from '@/lib/site-data';

const initial: RequestState = { ok: false };

const field =
  'w-full rounded-[10px] border border-line-2 bg-bg-3 px-3 py-3 text-[15px] text-ink focus:border-transparent focus:outline-2 focus:outline-aurora';
const label = 'mb-2 block text-[12.5px] font-semibold text-ink-3';

/* Перечень дат между заездом и выездом включительно. */
function rangeDates(from: string, to: string): string[] {
  if (!from || !to || to < from) return [];
  const out: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function RequestForm({
  houses,
  tours,
  busyByHouse = {},
}: {
  houses: Pick<HouseRecord, 'id' | 'title'>[];
  tours: Pick<TourRecord, 'id' | 'title'>[];
  busyByHouse?: Record<string, string[]>;
}) {
  const [state, formAction, pending] = useActionState(submitRequest, initial);
  const [guests, setGuests] = useState(2);
  const [houseId, setHouseId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  /* Предупреждаем сразу, а не после отправки: занятые даты видны гостю,
     и он не тратит время на заявку, которую всё равно придётся переносить. */
  const busy = houseId ? (busyByHouse[houseId] ?? []) : [];
  const clash = rangeDates(dateFrom, dateTo).filter((date) => busy.includes(date));
  const today = new Date().toISOString().slice(0, 10);

  if (state.ok) {
    return (
      <div className="border-line bg-bg-3 rounded-[18px] border p-8 text-center">
        <p className="text-aurora mb-2 text-[19px] font-bold">Заявка отправлена</p>
        <p className="text-ink-2">
          Мы получили её и свяжемся с вами в ближайшее время. Если вопрос срочный — напишите в
          Telegram или WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className={label} htmlFor="direction">
          Куда едете
        </label>
        <select id="direction" name="direction" className={field} defaultValue="Рыбачий">
          <option value="Рыбачий">Полуостров Рыбачий</option>
          <option value="Териберка">Териберка</option>
          <option value="Ещё не решили">Ещё не решили</option>
        </select>
      </div>

      {tours.length > 0 ? (
        <div>
          <label className={label} htmlFor="tourId">
            Тур
          </label>
          <select id="tourId" name="tourId" className={field} defaultValue="">
            <option value="">Не выбран</option>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {houses.length > 0 ? (
        <div>
          <label className={label} htmlFor="houseId">
            Домик
          </label>
          <select
            id="houseId"
            name="houseId"
            className={field}
            value={houseId}
            onChange={(e) => setHouseId(e.target.value)}
          >
            <option value="">Не выбран</option>
            {houses.map((house) => (
              <option key={house.id} value={house.id}>
                {house.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className={label} htmlFor="dateFrom">
          Заезд
        </label>
        <input
          id="dateFrom"
          name="dateFrom"
          type="date"
          min={today}
          className={field}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
      </div>

      <div>
        <label className={label} htmlFor="dateTo">
          Выезд
        </label>
        <input
          id="dateTo"
          name="dateTo"
          type="date"
          min={dateFrom || today}
          className={field}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
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
        <input id="name" name="name" required minLength={2} className={field} autoComplete="name" />
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
          disabled={pending}
          className="bg-aurora text-aurora-ink hover:bg-aurora-hi cursor-pointer rounded-full px-7 py-3 font-semibold disabled:opacity-60"
        >
          {pending ? 'Отправляем…' : 'Отправить заявку'}
        </button>
      </div>
    </form>
  );
}
