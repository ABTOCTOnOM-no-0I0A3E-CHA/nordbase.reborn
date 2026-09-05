'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, gte, lte, ne, or } from 'drizzle-orm';
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
  .refine((v) => v.dateTo >= v.dateFrom, {
    message: 'Дата выезда раньше даты заезда',
    path: ['dateTo'],
  });

export type BookingState = { error?: string; ok?: boolean };

export async function saveBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  await requireUser();

  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Проверьте поля' };

  const input = parsed.data;

  /* Два заезда в один домик на пересекающиеся даты — это ошибка ввода, а не
     редкий случай. Отменённые брони пересечением не считаем. */
  const overlapping = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.houseId, input.houseId),
        ne(bookings.status, 'cancelled'),
        lte(bookings.dateFrom, input.dateTo),
        gte(bookings.dateTo, input.dateFrom),
        input.id ? ne(bookings.id, input.id) : undefined,
      ),
    )
    .limit(1);

  if (overlapping.length > 0 && input.status !== 'cancelled') {
    return { error: 'На эти даты домик уже занят' };
  }

  const values = {
    houseId: input.houseId,
    requestId: input.requestId || null,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    status: input.status,
    note: input.note,
  };

  if (input.id) {
    await db.update(bookings).set(values).where(eq(bookings.id, input.id));
  } else {
    await db.insert(bookings).values(values);
  }

  revalidatePath('/admin/calendar');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteBooking(formData: FormData): Promise<void> {
  await requireUser();
  await db.delete(bookings).where(eq(bookings.id, z.uuid().parse(formData.get('id'))));
  revalidatePath('/admin/calendar');
  revalidatePath('/', 'layout');
}

/* Создаёт бронь прямо из заявки — самый частый путь: посмотрел заявку,
   позвонил, подтвердил. */
export async function bookFromRequest(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));

  const rows = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
  const request = rows[0];
  if (!request || !request.houseId || !request.dateFrom || !request.dateTo) return;

  const overlapping = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.houseId, request.houseId),
        ne(bookings.status, 'cancelled'),
        lte(bookings.dateFrom, request.dateTo),
        gte(bookings.dateTo, request.dateFrom),
      ),
    )
    .limit(1);

  if (overlapping.length > 0) return;

  await db.insert(bookings).values({
    houseId: request.houseId,
    requestId: request.id,
    dateFrom: request.dateFrom,
    dateTo: request.dateTo,
    status: 'confirmed',
    note: `${request.name}, ${request.phone}`,
  });

  await db.update(requests).set({ status: 'confirmed' }).where(eq(requests.id, id));

  revalidatePath('/admin/calendar');
  revalidatePath('/admin/requests');
  revalidatePath('/', 'layout');
}

/* Занятость для публичной формы и календаря — один источник на всех. */
export async function loadOccupancy(from: string, to: string) {
  return db
    .select({
      houseId: bookings.houseId,
      dateFrom: bookings.dateFrom,
      dateTo: bookings.dateTo,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        ne(bookings.status, 'cancelled'),
        or(
          and(gte(bookings.dateFrom, from), lte(bookings.dateFrom, to)),
          and(gte(bookings.dateTo, from), lte(bookings.dateTo, to)),
          and(lte(bookings.dateFrom, from), gte(bookings.dateTo, to)),
        ),
      ),
    );
}
