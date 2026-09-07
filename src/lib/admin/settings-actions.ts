'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { requireOwner } from '@/lib/auth/guard';

const schema = z.object({
  brandName: z.string().trim().min(1, 'Название в шапке обязательно').max(60),
  legalName: z.string().trim().min(1, 'Название базы обязательно').max(120),
  seoTitle: z.string().trim().max(200),
  seoDescription: z.string().trim().max(400),
  ctaLabel: z.string().trim().min(1, 'Надпись на кнопке обязательна').max(60),
  reviewsUrl: z.string().trim().max(300),
  reviewsLabel: z.string().trim().max(120),
  phone: z.string().trim().max(40),
  telegram: z.string().trim().max(300),
  whatsapp: z.string().trim().max(300),
  vk: z.string().trim().max(300),
  address: z.string().trim().max(200),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  /* Коды из Яндекс.Вебмастера и Google Search Console. Вставляют целиком
     мета-тег или только его содержимое — вытаскиваем content сами. */
  yandexVerification: z.string().trim().max(200).default(''),
  googleVerification: z.string().trim().max(200).default(''),
  ogMediaId: z.union([z.uuid(), z.literal('')]).default(''),
  /* Только цифры: владелец копирует номер счётчика, иногда вместе с текстом. */
  metrikaId: z.string().trim().max(30).default(''),
});

/* Из <meta name="yandex-verification" content="abc123" /> берём abc123:
   владелец копирует тег целиком, и это нормально. */
function verificationCode(value: string): string {
  const match = value.match(/content=["']([^"']+)["']/i);
  return (match?.[1] ?? value).trim();
}

export async function saveSettings(formData: FormData): Promise<void> {
  /* Контакты и меню меняет только владелец: менеджер работает с заявками. */
  await requireOwner();

  const base = schema.parse(Object.fromEntries(formData));

  /* Меню приходит парами полей: подпись и адрес. Пустые строки отбрасываем,
     чтобы случайно оставленная пустая строка не рисовала дыру в шапке. */
  const labels = formData.getAll('menuLabel').map(String);
  const hrefs = formData.getAll('menuHref').map(String);
  const menu = labels
    .map((label, i) => ({ label: label.trim(), href: (hrefs[i] ?? '').trim() }))
    .filter((item) => item.label !== '' && item.href !== '');

  /* Варианты «Куда едете» — по одному на строку: отдельный редактор списка
     ради трёх значений был бы избыточен. */
  const directions = String(formData.get('directions') ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const value = {
    ...base,
    metrikaId: base.metrikaId.replace(/\D/g, ''),
    yandexVerification: verificationCode(base.yandexVerification),
    googleVerification: verificationCode(base.googleVerification),
    menu,
    directions,
  };

  await db
    .insert(settings)
    .values({ key: 'site', value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });

  revalidatePath('/', 'layout');
}
