'use client';

import { useState } from 'react';
import { useFormAction } from '@/lib/use-form-action';
import { useToast } from './Toast';
import { saveBooking, type BookingState } from '@/lib/admin/request-actions';
import { Field, Input, Select, Submit } from './ui';
import { DateField } from '@/components/form/DateField';
import { NumberField } from '@/components/form/NumberField';

const initial: BookingState = {};

export function BookingForm({ houses }: { houses: { id: string; title: string }[] }) {
  /* Даты держим в состоянии: выезд не должен быть раньше заезда. */
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const toast = useToast();
  const { state, pending, onSubmit } = useFormAction(saveBooking, initial, {
    onSuccess: (next) => {
      if (next.error) toast.error(next.error);
      else toast.ok('Даты отмечены как занятые');
    },
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value="" />
      <input type="hidden" name="requestId" value="" />

      <Field label="Домик">
        <Select
          name="houseId"
          required
          placeholder="Выберите домик"
          options={houses.map((house) => ({ value: house.id, label: house.title }))}
        />
      </Field>

      <Field label="Состояние">
        <Select
          name="status"
          defaultValue="confirmed"
          options={[
            { value: 'confirmed', label: 'Подтверждена' },
            { value: 'hold', label: 'Придержана' },
            { value: 'cancelled', label: 'Отменена' },
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
        <NumberField name="guests" min={0} max={60} defaultValue={2} suffix="чел." />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Заметка" hint="Например, имя и телефон гостя">
          <Input name="note" placeholder="Анна, +7 921 000-00-00" />
        </Field>
      </div>

      {state.error ? <p className="text-busy text-[13.5px] sm:col-span-2">{state.error}</p> : null}
      {state.ok ? <p className="text-aurora text-[13.5px] sm:col-span-2">Бронь сохранена</p> : null}

      <div className="sm:col-span-2">
        <Submit pending={pending}>Добавить бронь</Submit>
      </div>
    </form>
  );
}
