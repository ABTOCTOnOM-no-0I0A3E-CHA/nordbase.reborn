'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, gt, lt, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { bookings, requests } from '@/db/schema';
import { requireUser } from '@/lib/auth/guard';

export async function setRequestStatus(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));
  const status = z.enum(['new', 'in_work', 'confirmed', 'cancelled']).parse(formData.get('status'));
  await db.update(requests).set({ status }).where(eq(requests.id, id));
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

export type BookFromRequestState = { error?: string; ok?: boolean };

/* Создаёт бронь прямо из заявки — самый частый путь: посмотрел заявку,
   позвонил, подтвердил. Возвращает состояние, а не молчит: раньше при
   занятых датах страница просто перерисовывалась без единого следа. */
export async function bookFromRequest(
  _prev: BookFromRequestState,
  formData: FormData,
): Promise<BookFromRequestState> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));

  const rows = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
  const request = rows[0];

  if (!request) return { error: 'Заявка не найдена' };
  if (!request.houseId || !request.dateFrom || !request.dateTo) {
    return { error: 'В заявке не указан домик или даты — заведите бронь вручную' };
  }
  if (request.dateTo <= request.dateFrom) {
    return { error: 'В заявке выезд не позже заезда — заведите бронь вручную' };
  }

  try {
    await db.transaction(async (tx) => {
      const clash = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(overlaps(request.houseId!, request.dateFrom!, request.dateTo!))
        .limit(1);

      if (clash.length > 0) throw new Error('OVERLAP');

      await tx.insert(bookings).values({
        houseId: request.houseId!,
        requestId: request.id,
        dateFrom: request.dateFrom!,
        dateTo: request.dateTo!,
        status: 'confirmed',
        note: `${request.name}, ${request.phone}`,
      });

      await tx.update(requests).set({ status: 'confirmed' }).where(eq(requests.id, id));
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (message === 'OVERLAP' || message.includes('bookings_no_overlap')) {
      return { error: 'На эти даты домик уже занят — предложите гостю другие' };
    }
    throw cause;
  }

  revalidatePath('/admin/calendar');
  revalidatePath('/admin/requests');
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
  return { ok: true };
}
