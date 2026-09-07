import 'server-only';
import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { pushSubscriptions, settings } from '@/db/schema';
import { siteUrl } from './site-url';

/* Уведомления прямо на телефон, без магазинов приложений.

   Владелец добавляет панель на главный экран, разрешает уведомления — и новые
   заявки падают на экран блокировки. Ни аккаунта разработчика, ни публикации
   в сторах для этого не нужно: подписи достаточно пары ключей, которые мы
   генерируем сами при первом включении и храним в настройках.

   Работает на Android везде; на iPhone — с 16.4 и только после добавления на
   главный экран, это ограничение Apple. Поэтому push у нас дополняет Telegram
   и ВКонтакте, а не заменяет их. */

export const PUSH_KEY = 'push';

const keysSchema = z.object({
  publicKey: z.string().catch(''),
  privateKey: z.string().catch(''),
});

export type PushKeys = z.infer<typeof keysSchema>;

/* Ключи создаются один раз и живут в базе: перевыпуск отвяжет все устройства,
   поэтому генерируем только когда их ещё нет. */
export async function ensurePushKeys(): Promise<PushKeys> {
  const rows = await db.select().from(settings).where(eq(settings.key, PUSH_KEY)).limit(1);
  const stored = keysSchema.safeParse(rows[0]?.value ?? {});

  if (stored.success && stored.data.publicKey && stored.data.privateKey) {
    return stored.data;
  }

  const generated = webpush.generateVAPIDKeys();
  const value = { publicKey: generated.publicKey, privateKey: generated.privateKey };

  await db
    .insert(settings)
    .values({ key: PUSH_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });

  return value;
}

export async function loadPublicKey(): Promise<string> {
  const rows = await db.select().from(settings).where(eq(settings.key, PUSH_KEY)).limit(1);
  const stored = keysSchema.safeParse(rows[0]?.value ?? {});
  return stored.success ? stored.data.publicKey : '';
}

export type PushResult = { ok: boolean; sent: number; reason?: string };

export async function sendPush(
  title: string,
  body: string,
  url: string = '/admin/requests',
): Promise<PushResult> {
  const devices = await db.select().from(pushSubscriptions);
  if (devices.length === 0) return { ok: false, sent: 0, reason: 'нет подключённых устройств' };

  const keys = await ensurePushKeys();
  webpush.setVapidDetails(siteUrl(), keys.publicKey, keys.privateKey);

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;

  for (const device of devices) {
    try {
      await webpush.sendNotification(
        {
          endpoint: device.endpoint,
          keys: { p256dh: device.p256dh, auth: device.auth },
        },
        payload,
      );
      sent += 1;
    } catch (cause) {
      const status = (cause as { statusCode?: number }).statusCode;
      /* 404 и 410 означают, что подписка мертва: телефон сброшен, приложение
         удалено с экрана, разрешение отозвано. Держать её незачем. */
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, device.id));
      } else {
        console.error('[push] не удалось отправить:', status, cause);
      }
    }
  }

  return sent > 0
    ? { ok: true, sent }
    : { ok: false, sent: 0, reason: 'ни одно устройство не приняло уведомление' };
}
