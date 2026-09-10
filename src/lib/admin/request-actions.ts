'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, gt, lt, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { bookings, requests, settings } from '@/db/schema';
import { requireUser } from '@/lib/auth/guard';

export async function setRequestStatus(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));
  const status = z.enum(['new', 'in_work', 'confirmed', 'cancelled']).parse(formData.get('status'));
  await db.update(requests).set({ status }).where(eq(requests.id, id));
  revalidatePath('/admin/requests');
  revalidatePath('/admin');
}

/* Копия заявки. Пригождается, когда гость возвращается: те же контакты,
   а даты и домик правятся уже в копии. Копия всегда заводится новой,
   даже если исходная закрыта. */
export async function duplicateRequest(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));

  const rows = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
  const source = rows[0];
  if (!source) return;

  await db.insert(requests).values({
    direction: source.direction,
    tourId: source.tourId,
    houseId: source.houseId,
    dateFrom: source.dateFrom,
    dateTo: source.dateTo,
    guests: source.guests,
    meals: source.meals,
    banya: source.banya,
    name: source.name,
    phone: source.phone,
    comment: source.comment,
    status: 'new',
    /* Согласие получено от того же гостя — переносим момент как есть,
       новую отметку тут ставить нельзя: гость ничего не подтверждал. */
    consentAt: source.consentAt,
  });

  revalidatePath('/admin/requests');
  revalidatePath('/admin');
}

export async function deleteRequest(formData: FormData): Promise<void> {
  await requireUser();
  await db.delete(requests).where(eq(requests.id, z.uuid().parse(formData.get('id'))));
  revalidatePath('/admin/requests');
  revalidatePath('/admin');
}

/* ------------------------------------------------------------------ брони */

const bookingSchema = z
  .object({
    id: z.union([z.uuid(), z.literal('')]).default(''),
    houseId: z.uuid('Выберите домик'),
    requestId: z.union([z.uuid(), z.literal('')]).default(''),
    dateFrom: z.iso.date('Укажите дату заезда'),
    dateTo: z.iso.date('Укажите дату выезда'),
    guests: z.coerce.number().int().min(0).max(60).default(0),
    status: z.enum(['hold', 'confirmed', 'cancelled']),
    note: z.string().trim().max(500).default(''),
  })
  .refine((v) => v.dateTo > v.dateFrom, {
    message: 'Выезд должен быть позже заезда хотя бы на день',
    path: ['dateTo'],
  });

export type BookingState = { error?: string; ok?: boolean };

/* Пересечение полуоткрытых интервалов [from; to): день выезда одной брони
   может быть днём заезда следующей, поэтому сравнения строгие.
   Отменённые брони пересечением не считаются. */
function overlaps(houseId: string, from: string, to: string, exceptId?: string) {
  return and(
    eq(bookings.houseId, houseId),
    ne(bookings.status, 'cancelled'),
    lt(bookings.dateFrom, to),
    gt(bookings.dateTo, from),
    exceptId ? ne(bookings.id, exceptId) : undefined,
  );
}

export async function saveBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  await requireUser();

  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Проверьте поля' };

  const input = parsed.data;

  const values = {
    houseId: input.houseId,
    requestId: input.requestId || null,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    guests: input.guests,
    status: input.status,
    note: input.note,
  };

  /* Проверка и запись в одной транзакции: без этого два менеджера, нажавшие
     «Добавить» одновременно, заведут две пересекающиеся брони. Последней
     линией обороны служит ограничение bookings_no_overlap в БД. */
  try {
    await db.transaction(async (tx) => {
      if (input.status !== 'cancelled') {
        const clash = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(overlaps(input.houseId, input.dateFrom, input.dateTo, input.id || undefined))
          .limit(1);

        if (clash.length > 0) throw new Error('OVERLAP');
      }

      if (input.id) {
        await tx.update(bookings).set(values).where(eq(bookings.id, input.id));
      } else {
        await tx.insert(bookings).values(values);
      }
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (message === 'OVERLAP' || message.includes('bookings_no_overlap')) {
      return { error: 'На эти даты домик уже занят' };
    }
    throw cause;
  }

  revalidatePath('/admin/calendar');
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteBooking(formData: FormData): Promise<void> {
  await requireUser();
  await db.delete(bookings).where(eq(bookings.id, z.uuid().parse(formData.get('id'))));
  revalidatePath('/admin/calendar');
  revalidatePath('/', 'layout');
}

/* Заявка → бронь одним нажатием.

   Раньше владелец, договорившись с гостем, переписывал даты и имя в форму
   занятости руками. Теперь заявка переносится целиком: домик, даты, гости,
   контакт. Заявка при этом помечается подтверждённой — она своё отработала. */
export async function bookFromRequest(formData: FormData): Promise<void> {
  await requireUser();

  const id = z.uuid().parse(formData.get('id'));
  const rows = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
  const request = rows[0];
  if (!request) throw new Error('Заявка не найдена');

  if (!request.houseId) throw new Error('В заявке не выбран домик — впишите бронь вручную');
  if (!request.dateFrom || !request.dateTo) throw new Error('В заявке нет дат — впишите вручную');

  const values = {
    houseId: request.houseId,
    requestId: request.id,
    dateFrom: request.dateFrom,
    dateTo: request.dateTo,
    guests: request.guests,
    status: 'hold' as const,
    /* Имя и телефон в заметке: в шахматке видно, кто едет, без перехода
       в заявки. */
    note: `${request.name}, ${request.phone}`,
    contactKind: request.contactKind,
    contactValue: request.contactValue,
  };

  try {
    await db.transaction(async (tx) => {
      const clash = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(overlaps(values.houseId, values.dateFrom, values.dateTo))
        .limit(1);

      if (clash.length > 0) throw new Error('OVERLAP');

      await tx.insert(bookings).values(values);
      await tx.update(requests).set({ status: 'confirmed' }).where(eq(requests.id, id));
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (message === 'OVERLAP' || message.includes('bookings_no_overlap')) {
      throw new Error('На эти даты домик уже занят — проверьте занятость');
    }
    throw cause;
  }

  revalidatePath('/admin/requests');
  revalidatePath('/admin/calendar');
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
}

/* Вместимость заезда живёт отдельной строкой настроек — см. lib/occupancy-settings. */
export async function saveSeats(formData: FormData): Promise<void> {
  await requireUser();

  const seats = z.coerce.number().int().min(0).max(200).parse(formData.get('seats'));
  const prepayPercent = z.coerce.number().int().min(0).max(100).parse(formData.get('prepayPercent'));
  const mealsPrice = z.coerce.number().int().min(0).max(100000).parse(formData.get('mealsPrice'));
  const value = { seats, prepayPercent, mealsPrice };

  await db
    .insert(settings)
    .values({ key: 'occupancy', value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });

  revalidatePath('/admin/calendar');
}
