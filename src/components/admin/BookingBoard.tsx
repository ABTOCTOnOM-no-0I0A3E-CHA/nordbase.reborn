'use client';

import { useRef, useState } from 'react';
import { EmptyState, Panel } from './ui';
import { ActionForm } from './ActionForm';
import { Occupancy, type Booking, type House } from './Occupancy';
import { BookingForm } from './BookingForm';
import { deleteBooking } from '@/lib/admin/request-actions';

/* Шахматка, форма и список — один экран с общим выбором: клик по полосе в
   календаре открывает эту бронь в форме, а не заставляет искать её глазами
   в списке ниже. */

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'занято',
  hold: 'ждёт подтверждения',
  cancelled: 'отменена',
};

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-busy text-bg',
  hold: 'bg-amber text-bg',
  cancelled: 'border-line-2 text-ink-3 border',
};

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

export function BookingBoard({
  houses,
  bookings,
  today,
  vehicleCapacity,
}: {
  houses: House[];
  bookings: Booking[];
  today: string;
  vehicleCapacity: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const selected = bookings.find((booking) => booking.id === selectedId) ?? null;
  const houseById = new Map(houses.map((house) => [house.id, house.title]));
  const visible = bookings.filter((booking) => booking.status !== 'cancelled');

  function pick(id: string) {
    setSelectedId(id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div>
      <div className="mb-6">
        <Occupancy
          today={today}
          houses={houses}
          bookings={bookings}
          vehicleCapacity={vehicleCapacity}
          selectedId={selectedId}
          onSelect={pick}
        />
      </div>

      <div ref={formRef}>
        <Panel
          className="mb-6"
          title={selected ? 'Изменить бронь' : 'Отметить занятые даты'}
          description={
            selected
              ? 'Правите бронь, выбранную в календаре. Чтобы завести новую — нажмите «Отменить правку».'
              : 'Подтвердили заезд по телефону — впишите даты здесь, и они пропадут из свободных на сайте.'
          }
        >
          <BookingForm
            /* Ключ перемонтирует форму: поля неуправляемые, иначе при выборе
               другой брони в них останутся прежние значения. */
            key={selected?.id ?? 'new'}
            houses={houses}
            booking={
              selected
                ? {
                    id: selected.id,
                    houseId: selected.houseId,
                    dateFrom: selected.dateFrom,
                    dateTo: selected.dateTo,
                    guests: selected.guests,
                    status: selected.status,
                    note: selected.note,
                  }
                : null
            }
            onDone={() => setSelectedId(null)}
          />
        </Panel>
      </div>

      <Panel title="Все брони" description="Ближайшие сверху. Нажмите «Изменить» или полосу в календаре.">
        {visible.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Занятых дат нет"
            description="Пока вы ничего не отметили, гость видит все даты свободными."
          />
        ) : (
          <div className="grid gap-2">
            {visible.map((booking) => {
              const active = booking.id === selectedId;
              return (
                <div
                  key={booking.id}
                  className={`flex flex-wrap items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-[13.5px] transition ${
                    active ? 'border-aurora bg-aurora/10' : 'border-line bg-bg-2'
                  }`}
                >
                  <b className="text-[14px]">{houseById.get(booking.houseId) ?? 'домик удалён'}</b>
                  <span className="text-ink-2 tabular-nums">
                    {formatDate(booking.dateFrom)} — {formatDate(booking.dateTo)}
                  </span>
                  {booking.guests ? (
                    <span className="text-ink-3">{booking.guests} чел.</span>
                  ) : null}
                  {booking.note ? <span className="text-ink-3">{booking.note}</span> : null}

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                      STATUS_STYLE[booking.status] ?? ''
                    }`}
                  >
                    {STATUS_LABEL[booking.status]}
                  </span>

                  <button
                    type="button"
                    onClick={() => pick(booking.id)}
                    className="border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink ml-auto cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                  >
                    Изменить
                  </button>

                  <ActionForm
                    action={deleteBooking}
                    success="Даты снова свободны"
                    confirm="Убрать бронь? Даты снова станут свободными."
                  >
                    <input type="hidden" name="id" value={booking.id} />
                    <button
                      type="submit"
                      className="border-busy/40 text-busy hover:bg-busy/10 hover:border-busy/70 cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                    >
                      Убрать
                    </button>
                  </ActionForm>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
