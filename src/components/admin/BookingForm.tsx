'use client';

import { useFormAction } from '@/lib/use-form-action';
import { saveBooking, type BookingState } from '@/lib/admin/request-actions';
import { Field, Input, Select, Submit } from './ui';

const initial: BookingState = {};

export function BookingForm({ houses }: { houses: { id: string; title: string }[] }) {
  const { state, pending, onSubmit } = useFormAction(saveBooking, initial);

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value="" />
      <input type="hidden" name="requestId" value="" />

      <Field label="Домик">
        <Select name="houseId" required defaultValue="">
          <option value="" disabled>
            Выберите домик
          </option>
          {houses.map((house) => (
            <option key={house.id} value={house.id}>
              {house.title}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Состояние">
        <Select name="status" defaultValue="confirmed">
          <option value="confirmed">Подтверждена</option>
          <option value="hold">Придержана</option>
          <option value="cancelled">Отменена</option>
        </Select>
      </Field>

      <Field label="Заезд">
        <Input name="dateFrom" type="date" required />
      </Field>
      <Field label="Выезд">
        <Input name="dateTo" type="date" required />
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
