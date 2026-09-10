'use client';

import { useRef, useState } from 'react';
import { EmptyState, Panel, Submit } from './ui';
import { NumberField } from '@/components/form/NumberField';
import { ActionForm } from './ActionForm';
import { Occupancy, type Booking, type House } from './Occupancy';
import { BookingForm } from './BookingForm';
import { deleteBooking, saveSeats } from '@/lib/admin/request-actions';
import { ContactButtons } from './ContactButtons';

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
      <div className="mb-4">
        <Occupancy
          today={today}
          houses={houses}
          bookings={bookings}
          vehicleCapacity={vehicleCapacity}
          selectedId={selectedId}
          onSelect={pick}
        />
      </div>

      {/* Вместимость правится здесь же, под таблицей: цифра из строки «Гостей»
          и поле, которое её задаёт, должны быть на одном экране. */}
      <div className="border-line bg-bg-3 mb-6 flex flex-wrap items-end gap-4 rounded-[14px] border px-4 py-3.5">
        <ActionForm action={saveSeats} success="Вместимость сохранена" className="flex items-end gap-3">
          <span>
            <span className="text-ink mb-1.5 block text-[13px] font-semibold">
              Сколько человек берёте в тур за день
            </span>
            <span className="block w-[160px]">
              <NumberField name="seats" defaultValue={vehicleCapacity} min={0} max={200} suffix="чел." />
            </span>
          </span>
          <Submit variant="ghost">Сохранить</Submit>
        </ActionForm>

        <p className="text-ink-3 max-w-[46ch] text-[12.5px] leading-[1.45]">
          Вездеход берёт четверых за поездку. Делаете два рейса — поставьте восемь. Ноль — не
          считать людей, следить только за объектами.
        </p>
      </div>

      {/* Правка и заведение новой брони — одна форма, поэтому режим видно по
          самой панели: цвет рамки, шапка с датами выбранной брони и импульс
          при переключении. Иначе меняется только содержимое полей ниже
          календаря, и понять, что происходит, невозможно. */}
      <section
        ref={formRef}
        key={selected?.id ?? 'new'}
        className={`mb-6 rounded-[16px] border ${
          selected
            ? 'border-aurora bg-aurora/8 edit-flash'
            : 'border-line bg-bg-3'
        }`}
      >
        {selected ? (
          <header className="border-aurora/30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-5 py-4">
            <span className="bg-aurora text-aurora-ink rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] uppercase">
              Правка
            </span>
            <h2 className="text-[15px] font-bold">
              {houseById.get(selected.houseId) ?? 'домик удалён'} ·{' '}
              <span className="tabular-nums">
                {formatDate(selected.dateFrom)} — {formatDate(selected.dateTo)}
              </span>
            </h2>
            {selected.note ? (
              <span className="text-ink-2 text-[13px]">{selected.note}</span>
            ) : null}
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink ml-auto cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
            >
              Отменить правку
            </button>
          </header>
        ) : (
          <header className="border-line border-b px-5 py-4">
            <h2 className="text-[15px] font-bold">Отметить занятые даты</h2>
            <p className="text-ink-3 mt-1 text-[13px] leading-[1.45]">
              Подтвердили заезд по телефону — впишите даты здесь, и они пропадут из свободных на
              сайте.
            </p>
          </header>
        )}

        <div className="p-5">
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
        </div>
      </section>

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
                  {booking.contactValue || /^[+\d]/.test(booking.note) ? (
                    <ContactButtons
                      phone={booking.note.match(/[+\d][\d\s()-]{9,}/)?.[0] ?? ''}
                      kind={booking.contactKind}
                      value={booking.contactValue}
                      size="small"
                    />
                  ) : null}

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                      STATUS_STYLE[booking.status] ?? ''
                    }`}
                  >
                    {STATUS_LABEL[booking.status]}
                  </span>

                  {active ? (
                    <span className="bg-aurora text-aurora-ink ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] uppercase">
                      Правится
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => pick(booking.id)}
                      className="border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink ml-auto cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                    >
                      Изменить
                    </button>
                  )}

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
