'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { requireOwner } from '@/lib/auth/guard';

const schema = z.object({
  phone: z.string().trim().max(40),
  telegram: z.string().trim().max(300),
  whatsapp: z.string().trim().max(300),
  vk: z.string().trim().max(300),
  address: z.string().trim().max(200),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

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

  const value = { ...base, menu };

  await db
    .insert(settings)
    .values({ key: 'site', value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });

  revalidatePath('/', 'layout');
}
