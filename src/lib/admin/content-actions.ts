'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { houses, pages, pageVersions, seasons, tourDays, tourStops, tours } from '@/db/schema';
import { requireUser } from '@/lib/auth/guard';
import { blocksSchema } from '@/lib/blocks';
import { moveRow } from './reorder';

function refresh() {
  revalidatePath('/', 'layout');
}


export type FormState = { error?: string };

/* Разбираем отказ так, чтобы владелец увидел причину, а не страницу 500.
   23505 — нарушение уникальности; единственный такой индекс здесь — на адресе. */
function toFormState(cause: unknown): FormState {
  const code = typeof cause === 'object' && cause !== null && 'code' in cause ? String((cause as { code: unknown }).code) : '';
  if (code === '23505') return { error: 'Такой адрес уже занят — придумайте другой' };
  if (cause instanceof z.ZodError) {
    return { error: cause.issues[0]?.message ?? 'Проверьте заполнение полей' };
  }
  throw cause;
}

/* redirect и notFound работают через исключение — его нельзя перехватывать. */
function isControlFlow(cause: unknown): boolean {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'digest' in cause &&
    typeof (cause as { digest: unknown }).digest === 'string' &&
    ((cause as { digest: string }).digest.startsWith('NEXT_REDIRECT') ||
      (cause as { digest: string }).digest === 'NEXT_NOT_FOUND')
  );
}

/* Сколько версий страницы храним. Редактор показывает 10. */
const KEEP_VERSIONS = 20;

/* Пустой slug — это главная. Остальные пути: латиница, цифры, дефис и слэш. */
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(160)
  .refine((v) => v === '' || /^[a-z0-9]+(?:[-a-z0-9]*)(?:\/[a-z0-9][-a-z0-9]*)*$/.test(v), {
    message: 'Адрес может содержать только латиницу, цифры, дефис и слэш',
  });

const entitySlug = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Адрес обязателен')
  .max(120)
  .regex(/^[a-z0-9][-a-z0-9]*$/, 'Только латиница, цифры и дефис');

const statusSchema = z.enum(['draft', 'published']);

const optionalInt = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0), 'Введите целое число');

/* Характеристики приходят двумя параллельными списками полей формы. */
function readMeta(formData: FormData): { label: string; value: string }[] {
  const labels = formData.getAll('metaLabel').map(String);
  const values = formData.getAll('metaValue').map(String);
  return labels
    .map((label, i) => ({ label: label.trim(), value: (values[i] ?? '').trim() }))
    .filter((row) => row.label !== '' && row.value !== '');
}

/* --------------------------------------------------------------- страницы */

const pageSchema = z.object({
  id: z.union([z.uuid(), z.literal('')]).default(''),
  slug: slugSchema,
  title: z.string().trim().min(1, 'Название обязательно').max(200),
  seoTitle: z.string().trim().max(200).default(''),
  seoDescription: z.string().trim().max(400).default(''),
  status: statusSchema,
});

export async function savePage(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  try {
    return await savePageInner(formData);
  } catch (cause) {
    if (isControlFlow(cause)) throw cause;
    return toFormState(cause);
  }
}

async function savePageInner(formData: FormData): Promise<FormState> {
  const input = pageSchema.parse(Object.fromEntries(formData));

  const values = {
    slug: input.slug,
    title: input.title,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    status: input.status,
    updatedAt: new Date(),
  };

  if (input.id) {
    const [current] = await db
      .select({ publishedAt: pages.publishedAt })
      .from(pages)
      .where(eq(pages.id, input.id))
      .limit(1);

    /* Дата публикации ставится один раз. Правка заголовка не должна её
       переставлять, а возврат в черновик — стирать: иначе история врёт. */
    await db
      .update(pages)
      .set({
        ...values,
        publishedAt:
          current?.publishedAt ?? (input.status === 'published' ? new Date() : null),
      })
      .where(eq(pages.id, input.id));
    refresh();
    return {};
  }

  const [created] = await db
    .insert(pages)
    .values({
      ...values,
      body: [],
      publishedAt: input.status === 'published' ? new Date() : null,
    })
    .returning({ id: pages.id });
  refresh();
  if (created) redirect(`/admin/pages/${created.id}`);
  return {};
}

export async function deletePage(formData: FormData): Promise<void> {
  await requireUser();
  await db.delete(pages).where(eq(pages.id, z.uuid().parse(formData.get('id'))));
  refresh();
  redirect('/admin/pages');
}

/* Перед записью кладём снимок прежнего тела — это и есть откат на прошлую версию. */
export async function savePageBlocks(rawId: string, json: string): Promise<void> {
  const user = await requireUser();
  /* id приходит из адреса страницы — проверяем, иначе Postgres
     ответит ошибкой синтаксиса uuid вместо понятного отказа. */
  const id = z.uuid().parse(rawId);
  const blocks = blocksSchema.parse(JSON.parse(json));

  const rows = await db.select({ body: pages.body }).from(pages).where(eq(pages.id, id)).limit(1);
  if (rows[0]) {
    await db.insert(pageVersions).values({
      pageId: id,
      snapshot: rows[0].body,
      authorId: user.id,
    });

    /* Держим только последние KEEP_VERSIONS снимков: редактор всё равно
       показывает десяток, а тело страницы с галереей весит немало. */
    const stale = await db
      .select({ id: pageVersions.id })
      .from(pageVersions)
      .where(eq(pageVersions.pageId, id))
      .orderBy(desc(pageVersions.createdAt))
      .offset(KEEP_VERSIONS);

    if (stale.length > 0) {
      await db.delete(pageVersions).where(
        inArray(
          pageVersions.id,
          stale.map((row) => row.id),
        ),
      );
    }
  }

  await db.update(pages).set({ body: blocks, updatedAt: new Date() }).where(eq(pages.id, id));
  refresh();
}

export async function restorePageVersion(formData: FormData): Promise<void> {
  await requireUser();
  const versionId = z.uuid().parse(formData.get('versionId'));

  const rows = await db
    .select({ pageId: pageVersions.pageId, snapshot: pageVersions.snapshot })
    .from(pageVersions)
    .where(eq(pageVersions.id, versionId))
    .limit(1);

  const version = rows[0];
  if (!version) return;

  const blocks = blocksSchema.parse(version.snapshot);
  await db
    .update(pages)
    .set({ body: blocks, updatedAt: new Date() })
    .where(eq(pages.id, version.pageId));
  refresh();
}

/* ---------------------------------------------------------------- домики */

const houseSchema = z.object({
  id: z.union([z.uuid(), z.literal('')]).default(''),
  slug: entitySlug,
  title: z.string().trim().min(1, 'Название обязательно').max(200),
  summary: z.string().trim().max(600).default(''),
  capacity: z.coerce.number().int().min(1).max(30),
  pricePerNight: optionalInt,
  coverId: z.union([z.uuid(), z.literal('')]).default(''),
  status: statusSchema,
});

export async function saveHouse(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  try {
    return await saveHouseInner(formData);
  } catch (cause) {
    if (isControlFlow(cause)) throw cause;
    return toFormState(cause);
  }
}

async function saveHouseInner(formData: FormData): Promise<FormState> {
  const input = houseSchema.parse(Object.fromEntries(formData));
  const values = {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    capacity: input.capacity,
    pricePerNight: input.pricePerNight,
    coverId: input.coverId || null,
    status: input.status,
    meta: readMeta(formData),
  };

  if (input.id) {
    await db.update(houses).set(values).where(eq(houses.id, input.id));
    refresh();
    return {};
  }

  const [row] = await db
    .select({ max: sql<number | null>`max(${houses.sort})` })
    .from(houses);
  const [created] = await db
    .insert(houses)
    .values({ ...values, sort: (row?.max ?? -1) + 1 })
    .returning({ id: houses.id });
  refresh();
  if (created) redirect(`/admin/houses/${created.id}`);
  return {};
}

export async function saveHouseBlocks(rawId: string, json: string): Promise<void> {
  await requireUser();
  /* id приходит из адреса страницы — проверяем, иначе Postgres
     ответит ошибкой синтаксиса uuid вместо понятного отказа. */
  const id = z.uuid().parse(rawId);
  const blocks = blocksSchema.parse(JSON.parse(json));
  await db.update(houses).set({ body: blocks }).where(eq(houses.id, id));
  refresh();
}

export async function deleteHouse(formData: FormData): Promise<void> {
  await requireUser();
  await db.delete(houses).where(eq(houses.id, z.uuid().parse(formData.get('id'))));
  refresh();
  redirect('/admin/houses');
}

export async function moveHouse(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));
  const direction = z.enum(['up', 'down']).parse(formData.get('direction'));
  await moveRow(houses, houses.id, houses.sort, id, direction);
  refresh();
}

/* ------------------------------------------------------------------ туры */

const tourSchema = z.object({
  id: z.union([z.uuid(), z.literal('')]).default(''),
  slug: entitySlug,
  title: z.string().trim().min(1, 'Название обязательно').max(200),
  summary: z.string().trim().max(600).default(''),
  days: z.coerce.number().int().min(1).max(30),
  price: optionalInt,
  coverId: z.union([z.uuid(), z.literal('')]).default(''),
  status: statusSchema,
});

export async function saveTour(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  try {
    return await saveTourInner(formData);
  } catch (cause) {
    if (isControlFlow(cause)) throw cause;
    return toFormState(cause);
  }
}

async function saveTourInner(formData: FormData): Promise<FormState> {
  const input = tourSchema.parse(Object.fromEntries(formData));
  const values = {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    days: input.days,
    price: input.price,
    coverId: input.coverId || null,
    status: input.status,
    meta: readMeta(formData),
  };

  if (input.id) {
    await db.update(tours).set(values).where(eq(tours.id, input.id));
    refresh();
    return {};
  }

  const [row] = await db.select({ max: sql<number | null>`max(${tours.sort})` }).from(tours);
  const [created] = await db
    .insert(tours)
    .values({ ...values, sort: (row?.max ?? -1) + 1 })
    .returning({ id: tours.id });
  refresh();
  if (created) redirect(`/admin/tours/${created.id}`);
  return {};
}

export async function saveTourBlocks(rawId: string, json: string): Promise<void> {
  await requireUser();
  /* id приходит из адреса страницы — проверяем, иначе Postgres
     ответит ошибкой синтаксиса uuid вместо понятного отказа. */
  const id = z.uuid().parse(rawId);
  const blocks = blocksSchema.parse(JSON.parse(json));
  await db.update(tours).set({ body: blocks }).where(eq(tours.id, id));
  refresh();
}

const programSchema = z.array(
  z.object({
    title: z.string().trim().max(120),
    stops: z.array(z.object({ title: z.string().trim().min(1), isFinish: z.boolean() })),
  }),
);

/* Программу переписываем целиком: дней и точек единицы, а сравнивать построчно
   ради экономии пары запросов — лишняя сложность и лишний источник ошибок.
   Всё в одной транзакции, чтобы тур не остался без программы при сбое. */
export async function saveTourProgram(rawId: string, json: string): Promise<void> {
  await requireUser();
  /* id приходит из адреса страницы — проверяем, иначе Postgres
     ответит ошибкой синтаксиса uuid вместо понятного отказа. */
  const id = z.uuid().parse(rawId);
  const program = programSchema.parse(JSON.parse(json));

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: tourDays.id })
      .from(tourDays)
      .where(eq(tourDays.tourId, id));

    if (existing.length > 0) {
      await tx.delete(tourDays).where(eq(tourDays.tourId, id));
    }

    for (const [index, day] of program.entries()) {
      const [created] = await tx
        .insert(tourDays)
        .values({ tourId: id, dayNo: index + 1, title: day.title || `День ${index + 1}` })
        .returning({ id: tourDays.id });
      if (!created || day.stops.length === 0) continue;

      await tx.insert(tourStops).values(
        day.stops.map((stop, i) => ({
          tourDayId: created.id,
          title: stop.title,
          isFinish: stop.isFinish,
          sort: i,
        })),
      );
    }
  });

  refresh();
}

export async function deleteTour(formData: FormData): Promise<void> {
  await requireUser();
  await db.delete(tours).where(eq(tours.id, z.uuid().parse(formData.get('id'))));
  refresh();
  redirect('/admin/tours');
}

export async function moveTour(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));
  const direction = z.enum(['up', 'down']).parse(formData.get('direction'));
  await moveRow(tours, tours.id, tours.sort, id, direction);
  refresh();
}

/* ---------------------------------------------------------------- сезоны */

const seasonSchema = z.object({
  id: z.union([z.uuid(), z.literal('')]).default(''),
  slug: entitySlug,
  title: z.string().trim().min(1, 'Название обязательно').max(120),
  accent: z.enum(['aurora', 'ice', 'violet', 'amber']),
  coverId: z.union([z.uuid(), z.literal('')]).default(''),
  status: statusSchema,
});

export async function saveSeason(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  try {
    return await saveSeasonInner(formData);
  } catch (cause) {
    if (isControlFlow(cause)) throw cause;
    return toFormState(cause);
  }
}

async function saveSeasonInner(formData: FormData): Promise<FormState> {
  const input = seasonSchema.parse(Object.fromEntries(formData));
  const values = {
    slug: input.slug,
    title: input.title,
    accent: input.accent,
    coverId: input.coverId || null,
    status: input.status,
  };

  if (input.id) {
    await db.update(seasons).set(values).where(eq(seasons.id, input.id));
    refresh();
    return {};
  }

  const [row] = await db.select({ max: sql<number | null>`max(${seasons.sort})` }).from(seasons);
  const [created] = await db
    .insert(seasons)
    .values({ ...values, sort: (row?.max ?? -1) + 1 })
    .returning({ id: seasons.id });
  refresh();
  if (created) redirect(`/admin/seasons/${created.id}`);
  return {};
}

export async function saveSeasonBlocks(rawId: string, json: string): Promise<void> {
  await requireUser();
  /* id приходит из адреса страницы — проверяем, иначе Postgres
     ответит ошибкой синтаксиса uuid вместо понятного отказа. */
  const id = z.uuid().parse(rawId);
  const blocks = blocksSchema.parse(JSON.parse(json));
  await db.update(seasons).set({ body: blocks }).where(eq(seasons.id, id));
  refresh();
}

export async function deleteSeason(formData: FormData): Promise<void> {
  await requireUser();
  await db.delete(seasons).where(eq(seasons.id, z.uuid().parse(formData.get('id'))));
  refresh();
  redirect('/admin/seasons');
}

export async function moveSeason(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));
  const direction = z.enum(['up', 'down']).parse(formData.get('direction'));
  await moveRow(seasons, seasons.id, seasons.sort, id, direction);
  refresh();
}
