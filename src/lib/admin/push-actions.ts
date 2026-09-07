'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { requireUser } from '@/lib/auth/guard';
import { ensurePushKeys, sendPush } from '@/lib/push';

/* Открытый ключ отдаём браузеру: подписаться без него нельзя. Секретный
   остаётся на сервере и наружу не выходит никогда. */
export async function getPushKey(): Promise<string> {
  await requireUser();
  const keys = await ensurePushKeys();
  return keys.publicKey;
}

const subscription = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function subscribePush(raw: unknown, label: string): Promise<{ error?: string }> {
  const user = await requireUser();

  const parsed = subscription.safeParse(raw);
  if (!parsed.success) return { error: 'Браузер вернул подписку в неожиданном виде' };

  const values = {
    userId: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    label: label.slice(0, 120),
  };

  /* Один и тот же телефон, подписавшийся повторно, должен обновлять запись,
     а не плодить дубликаты: адрес подписки браузер может перевыпустить. */
  await db
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: values.p256dh, auth: values.auth, label: values.label, userId: user.id },
    });

  revalidatePath('/admin/integrations');
  return {};
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  const user = await requireUser();
  await db
    .delete(pushSubscriptions)
    .where(
      and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, user.id)),
    );
  revalidatePath('/admin/integrations');
}

export async function removeDevice(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.uuid().parse(formData.get('id'));
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  revalidatePath('/admin/integrations');
}

export async function testPush(): Promise<void> {
  await requireUser();
  const result = await sendPush(
    'Проверка уведомлений',
    'Если вы это видите — заявки будут приходить так же',
  );
  if (!result.ok) throw new Error(result.reason ?? 'не удалось отправить');
}
