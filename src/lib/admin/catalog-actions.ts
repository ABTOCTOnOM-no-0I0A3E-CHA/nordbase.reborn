'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { faq, prices, reviews } from '@/db/schema';
import { requireUser } from '@/lib/auth/guard';
import { moveRow } from './reorder';

/* Публичные страницы читают справочники на каждом запросе, но у Next есть свой
   кеш роутера — после правки сбрасываем его целиком: страниц немного, а видеть
   изменения сразу для владельца важнее, чем экономить на инвалидации. */
function refresh() {
  revalidatePath('/', 'layout');
}

const text = (max = 500) => z.string().trim().max(max);
const optionalNumber = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : Number(v)))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), 'Введите положительное число');

/* Новая строка получает sort в конце списка. */
async function nextSort(table: typeof prices | typeof faq | typeof reviews): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${table.sort})` })
    .from(table);
  return (row?.max ?? -1) + 1;
}

/* ------------------------------------------------------------------ цены */

const priceSchema = z.object({
  id: z.union([z.uuid(), z.literal('')]).default(''),
  group: text(40),
  title: text(200).min(1, 'Название обязательно'),
  note: text(500).default(''),
  amount: optionalNumber,
  unit: text(80).default(''),
  visible: z.union([z.literal('on'), z.undefined()]).transform((v) => v === 'on'),
});

export async function savePrice(formData: FormData): Promise<void> {
  await requireUser();
  const input = priceSchema.parse(Object.fromEntries(formData));
  const { id, ...values } = input;

  if (id) {
    await db.update(prices).set(values).where(eq(prices.id, id));
  } else {
    await db.insert(prices).values({ ...values, sort: await nextSort(prices) });
  }
  refresh();
}

export async function deletePrice(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));
  await db.delete(prices).where(eq(prices.id, id));
  refresh();
}

export async function movePrice(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));
  const direction = z.enum(['up', 'down']).parse(formData.get('direction'));
  await moveRow(prices, prices.id, prices.sort, id, direction);
  refresh();
}

/* -------------------------------------------------------------- вопросы */

const faqSchema = z.object({
  id: z.union([z.uuid(), z.literal('')]).default(''),
  question: text(300).min(1, 'Вопрос обязателен'),
  answer: text(3000).min(1, 'Ответ обязателен'),
  visible: z.union([z.literal('on'), z.undefined()]).transform((v) => v === 'on'),
});

export async function saveFaq(formData: FormData): Promise<void> {
  await requireUser();
  const { id, ...values } = faqSchema.parse(Object.fromEntries(formData));

  if (id) {
    await db.update(faq).set(values).where(eq(faq.id, id));
  } else {
    await db.insert(faq).values({ ...values, sort: await nextSort(faq) });
  }
  refresh();
}

export async function deleteFaq(formData: FormData): Promise<void> {
  await requireUser();
  await db.delete(faq).where(eq(faq.id, z.uuid().parse(formData.get('id'))));
  refresh();
}

export async function moveFaq(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));
  const direction = z.enum(['up', 'down']).parse(formData.get('direction'));
  await moveRow(faq, faq.id, faq.sort, id, direction);
  refresh();
}

/* --------------------------------------------------------------- отзывы */

const reviewSchema = z.object({
  id: z.union([z.uuid(), z.literal('')]).default(''),
  author: text(120).min(1, 'Имя обязательно'),
  text: text(3000).min(1, 'Текст обязателен'),
  source: text(120).default(''),
  rating: optionalNumber.refine((v) => v === null || (v >= 1 && v <= 5), 'Оценка от 1 до 5'),
  visible: z.union([z.literal('on'), z.undefined()]).transform((v) => v === 'on'),
});

export async function saveReview(formData: FormData): Promise<void> {
  await requireUser();
  const { id, ...values } = reviewSchema.parse(Object.fromEntries(formData));

  if (id) {
    await db.update(reviews).set(values).where(eq(reviews.id, id));
  } else {
    await db.insert(reviews).values({ ...values, sort: await nextSort(reviews) });
  }
  refresh();
}

export async function deleteReview(formData: FormData): Promise<void> {
  await requireUser();
  await db.delete(reviews).where(eq(reviews.id, z.uuid().parse(formData.get('id'))));
  refresh();
}

export async function moveReview(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));
  const direction = z.enum(['up', 'down']).parse(formData.get('direction'));
  await moveRow(reviews, reviews.id, reviews.sort, id, direction);
  refresh();
}
