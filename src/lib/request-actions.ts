'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { houses, requests, tours } from '@/db/schema';
import { formatRequest, sendTelegram } from './telegram';
import { allow, clientKey } from './throttle';

/* Телефон принимаем в любом виде — гость пишет как привык, нормализуем сами. */
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d+]/g, ''))
  .refine((v) => v.replace(/\D/g, '').length >= 10, 'Телефон выглядит неполным');

const schema = z
  .object({
    direction: z.string().trim().max(80).default(''),
    tourId: z.union([z.uuid(), z.literal('')]).default(''),
    houseId: z.union([z.uuid(), z.literal('')]).default(''),
    dateFrom: z.union([z.iso.date(), z.literal('')]).default(''),
    dateTo: z.union([z.iso.date(), z.literal('')]).default(''),
    guests: z.coerce.number().int().min(1).max(20).default(1),
    meals: z.coerce.boolean().default(false),
    banya: z.coerce.boolean().default(false),
    name: z.string().trim().min(2, 'Как к вам обращаться?').max(120),
    phone,
    comment: z.string().trim().max(2000).default(''),
    consent: z.literal('on', { message: 'Нужно согласие на обработку данных' }),
  })
  .refine((v) => !v.dateFrom || !v.dateTo || v.dateTo >= v.dateFrom, {
    message: 'Дата выезда раньше даты заезда',
    path: ['dateTo'],
  });

export type RequestState = { ok: boolean; error?: string; field?: string };

export async function submitRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  /* Форма открыта всем: без ограничения скрипт зальёт таблицу заявок
     и завалит владельца уведомлениями в Telegram. */
  if (!allow(await clientKey('request'), 5, 10 * 60 * 1000)) {
    return { ok: false, error: 'Слишком много заявок подряд. Попробуйте через несколько минут.' };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? 'Проверьте поля', field: String(first?.path[0]) };
  }

  const input = parsed.data;

  const [saved] = await db
    .insert(requests)
    .values({
      direction: input.direction,
      tourId: input.tourId || null,
      houseId: input.houseId || null,
      dateFrom: input.dateFrom || null,
      dateTo: input.dateTo || null,
      guests: input.guests,
      meals: input.meals,
      banya: input.banya,
      name: input.name,
      phone: input.phone,
      comment: input.comment,
      /* 152-ФЗ: фиксируем момент согласия вместе с самой заявкой */
      consentAt: new Date(),
    })
    .returning({ id: requests.id });

  /* Названия, а не идентификаторы: владелец читает сообщение с телефона. */
  const [tour, house] = await Promise.all([
    input.tourId
      ? db.select({ title: tours.title }).from(tours).where(eq(tours.id, input.tourId)).limit(1)
      : [],
    input.houseId
      ? db.select({ title: houses.title }).from(houses).where(eq(houses.id, input.houseId)).limit(1)
      : [],
  ]);

  const dates =
    input.dateFrom && input.dateTo
      ? `${formatDate(input.dateFrom)} — ${formatDate(input.dateTo)}`
      : input.dateFrom
        ? `с ${formatDate(input.dateFrom)}`
        : '';

  await sendTelegram(
    formatRequest('Новая заявка с сайта', [
      { label: 'Имя', value: input.name },
      { label: 'Телефон', value: input.phone },
      { label: 'Направление', value: input.direction },
      { label: 'Тур', value: tour[0]?.title ?? '' },
      { label: 'Домик', value: house[0]?.title ?? '' },
      { label: 'Даты', value: dates },
      { label: 'Гостей', value: String(input.guests) },
      { label: 'Питание', value: input.meals ? 'да' : '' },
      { label: 'Баня', value: input.banya ? 'да' : '' },
      { label: 'Комментарий', value: input.comment },
      { label: 'Номер заявки', value: saved?.id.slice(0, 8) ?? '' },
    ]),
  );

  return { ok: true };
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}
