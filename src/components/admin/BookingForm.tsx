'use client';

import { useState } from 'react';
import { useFormAction } from '@/lib/use-form-action';
import { useToast } from './Toast';
import { saveBooking, type BookingState } from '@/lib/admin/request-actions';
import { Field, Input, Select, Submit } from './ui';
import { DateField } from '@/components/form/DateField';
import { NumberField } from '@/components/form/NumberField';

const initial: BookingState = {};

export type BookingDraft = {
  id: string;
  houseId: string;
  dateFrom: string;
  dateTo: string;
  guests: number;
  status: string;
  note: string;
};

export function BookingForm({
  houses,
  booking,
  onDone,
}: {
  houses: { id: string; title: string; capacity: number; minGuests: number }[];
  /* Задана — правим существующую бронь, пусто — заводим новую. */
  booking?: BookingDraft | null;
  onDone?: () => void;
}) {
  /* Даты держим в состоянии: выезд не должен быть раньше заезда. */
  const [from, setFrom] = useState(booking?.dateFrom ?? '');
  const [to, setTo] = useState(booking?.dateTo ?? '');
  const toast = useToast();
  const { state, pending, onSubmit } = useFormAction(saveBooking, initial, {
    onSuccess: (next) => {
      if (next.error) toast.error(next.error);
      else {
        toast.ok(booking ? 'Бронь изменена' : 'Даты отмечены как занятые');
        onDone?.();
      }
    },
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={booking?.id ?? ''} />
      <input type="hidden" name="requestId" value="" />

      <Field label="Домик">
        <Select
          name="houseId"
          required
          defaultValue={booking?.houseId}
          placeholder="Выберите домик"
          options={houses.map((house) => ({
            value: house.id,
            label:
              house.minGuests > 1
                ? `${house.title} · до ${house.capacity} мест, от ${house.minGuests}`
                : `${house.title} · до ${house.capacity} мест`,
          }))}
        />
      </Field>

      <Field label="Состояние">
        <Select
          name="status"
          defaultValue={booking?.status ?? 'confirmed'}
          options={[
            { value: 'confirmed', label: 'Занято — заезд подтверждён' },
            { value: 'hold', label: 'Ждёт подтверждения' },
            { value: 'cancelled', label: 'Отменена — даты свободны' },
          ]}
        />
      </Field>

      <Field label="Заезд">
        <DateField name="dateFrom" value={from} onChange={setFrom} required />
      </Field>
      <Field label="Выезд" hint="День выезда свободен — в него может заехать следующий гость.">
        <DateField name="dateTo" value={to} onChange={setTo} min={from} required />
      </Field>

      <Field
        label="Сколько человек"
        hint="Нужно, чтобы видеть, влезает ли группа в вездеход за одну поездку."
      >
        <NumberField
          name="guests"
          min={0}
          max={60}
          defaultValue={booking?.guests ?? 2}
          suffix="чел."
        />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Заметка" hint="Например, имя и телефон гостя">
          <Input name="note" defaultValue={booking?.note} placeholder="Анна, +7 921 000-00-00" />
        </Field>
      </div>

      {state.error ? <p className="text-busy text-[13.5px] sm:col-span-2">{state.error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Submit pending={pending}>{booking ? 'Сохранить изменения' : 'Добавить бронь'}</Submit>
        {booking ? (
          <button
            type="button"
            onClick={onDone}
            className="text-ink-3 hover:text-ink cursor-pointer text-[13.5px]"
          >
            Отменить правку
          </button>
        ) : null}
      </div>
    </form>
  );
}
