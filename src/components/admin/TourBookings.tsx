'use client';

import { useState } from 'react';
import { useFormAction } from '@/lib/use-form-action';
import { useToast } from './Toast';
import { ActionForm } from './ActionForm';
import { Field, Input, Panel, Select, Submit } from './ui';
import { DateField } from '@/components/form/DateField';
import { NumberField } from '@/components/form/NumberField';
import {
  deleteTourBooking,
  saveTourBooking,
  type BookingState,
} from '@/lib/admin/request-actions';

/* Занятость туров — отдельно от домиков.

   Тур не занимает жильё: группа может ночевать на базе, а может приехать
   одним днём. Ограничение тут своё — вездеход увозит четверых, поэтому две
   группы на одну дату не запрещены, но сумма людей за день видна сразу и
   краснеет при перегрузе. */

const initial: BookingState = {};

export type TourBooking = {
  id: string;
  tourId: string | null;
  dateFrom: string;
  dateTo: string;
  guests: number;
  status: 'hold' | 'confirmed' | 'cancelled';
  note: string;
};

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

/* Сколько людей стоит на каждую дату. День окончания включаем: тур идёт и
   в последний день, в отличие от ночёвки в домике. */
function guestsPerDay(items: TourBooking[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const item of items) {
    if (item.status === 'cancelled') continue;
    const cursor = new Date(`${item.dateFrom}T00:00:00Z`);
    const end = new Date(`${item.dateTo}T00:00:00Z`);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + item.guests);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return map;
}

export function TourBookings({
  tours,
  items,
  seats,
  today,
}: {
  tours: { id: string; title: string }[];
  items: TourBooking[];
  /* Сколько человек база берёт в тур за день. */
  seats: number;
  today: string;
}) {
  const toast = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { state, pending, onSubmit } = useFormAction(saveTourBooking, initial, {
    onSuccess: (next) => {
      if (next.error) toast.error(next.error);
      else {
        toast.ok('Тур записан');
        setFrom('');
        setTo('');
      }
    },
  });

  const perDay = guestsPerDay(items);
  const visible = items.filter((item) => item.status !== 'cancelled');
  const tourById = new Map(tours.map((tour) => [tour.id, tour.title]));

  /* Дни, на которые записано больше, чем увозит вездеход. */
  const overloaded = [...perDay.entries()]
    .filter(([date, count]) => seats > 0 && count > seats && date >= today)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <Panel
      className="mb-6"
      title="Туры"
      description="Тур не занимает домик — это отдельная запись. Следим за тем, сколько человек увозит вездеход за день."
    >
      {overloaded.length > 0 ? (
        <div className="border-busy/40 bg-busy/10 mb-4 rounded-[12px] border px-4 py-3">
          <b className="text-busy mb-1 block text-[13.5px]">
            Больше {seats} человек в день
          </b>
          <p className="text-ink-2 text-[13px] leading-[1.5]">
            {overloaded
              .slice(0, 4)
              .map(([date, count]) => `${formatDate(date)} — ${count}`)
              .join(', ')}
            . За одну поездку столько не увезти: либо второй рейс, либо перенос.
          </p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mb-5 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="id" value="" />

        <Field label="Тур">
          <Select
            name="tourId"
            placeholder="Не выбран"
            options={[
              { value: '', label: 'Не выбран' },
              ...tours.map((tour) => ({ value: tour.id, label: tour.title })),
            ]}
          />
        </Field>

        <Field label="Сколько человек" hint={seats > 0 ? `Вездеход увозит ${seats} за поездку` : undefined}>
          <NumberField name="guests" min={1} max={60} defaultValue={2} suffix="чел." />
        </Field>

        <Field label="Начало">
          <DateField name="dateFrom" value={from} onChange={setFrom} required />
        </Field>
        <Field label="Окончание" hint="Однодневный тур — та же дата">
          <DateField name="dateTo" value={to} onChange={setTo} min={from} required />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Заметка" hint="Например, имя и телефон гостя">
            <Input name="note" placeholder="Анна, +7 921 000-00-00" />
          </Field>
        </div>

        <input type="hidden" name="status" value="hold" />

        {state.error ? <p className="text-busy text-[13.5px] sm:col-span-2">{state.error}</p> : null}

        <div className="sm:col-span-2">
          <Submit pending={pending}>Записать тур</Submit>
        </div>
      </form>

      {visible.length === 0 ? (
        <p className="text-ink-3 text-[13.5px]">Туров пока не записано.</p>
      ) : (
        <div className="grid gap-2">
          {visible.map((item) => (
            <div
              key={item.id}
              className="border-line bg-bg-2 flex flex-wrap items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-[13.5px]"
            >
              <b className="text-[14px]">{tourById.get(item.tourId ?? '') ?? 'Тур'}</b>
              <span className="text-ink-2 tabular-nums">
                {formatDate(item.dateFrom)}
                {item.dateTo !== item.dateFrom ? ` — ${formatDate(item.dateTo)}` : ''}
              </span>
              <span className="text-ink-3">{item.guests} чел.</span>
              {item.note ? <span className="text-ink-3">{item.note}</span> : null}

              <ActionForm
                action={deleteTourBooking}
                success="Запись убрана"
                confirm="Убрать запись о туре?"
                className="ml-auto"
              >
                <input type="hidden" name="id" value={item.id} />
                <button
                  type="submit"
                  className="border-busy/40 text-busy hover:bg-busy/10 cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                >
                  Убрать
                </button>
              </ActionForm>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
