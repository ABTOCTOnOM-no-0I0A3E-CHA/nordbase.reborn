import 'server-only';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { request } from 'undici';
import { db } from '@/db';
import { settings } from '@/db/schema';

/* Уведомления во ВКонтакте — сообщением от имени сообщества.

   Для России это второй канал не «на всякий случай»: api.vk.com доступен
   напрямую, без прокси, в отличие от Telegram. Если прокси однажды отвалится,
   заявки продолжат приходить.

   Что нужно от владельца: ключ доступа сообщества с правом «Сообщения» и
   свой числовой id. Написать сообществу первым тоже придётся — ВКонтакте не
   даёт писать тому, кто не начинал диалог. */

export const VK_KEY = 'vk';

const schema = z.object({
  token: z.string().catch(''),
  peerId: z.string().catch(''),
});

export type VkConfig = z.infer<typeof schema>;

export async function loadVkConfig(): Promise<VkConfig> {
  const rows = await db.select().from(settings).where(eq(settings.key, VK_KEY)).limit(1);
  const parsed = schema.safeParse(rows[0]?.value ?? {});
  return parsed.success ? parsed.data : { token: '', peerId: '' };
}

/* Для формы: сам ключ наружу не отдаём, только факт, что он задан. */
export async function loadVkForForm(): Promise<{ hasToken: boolean; peerId: string }> {
  const config = await loadVkConfig();
  return { hasToken: Boolean(config.token), peerId: config.peerId };
}

export type VkResult = { ok: boolean; reason?: string };

export async function sendVkWith(config: VkConfig, text: string): Promise<VkResult> {
  if (!config.token || !config.peerId) {
    return { ok: false, reason: 'не заданы ключ сообщества или id получателя' };
  }

  const params = new URLSearchParams({
    access_token: config.token,
    v: '5.199',
    peer_id: config.peerId,
    message: text,
    /* Без random_id ВКонтакте отклонит отправку; он же защищает от дублей
       при повторе запроса. */
    random_id: String(Date.now() % 2_147_483_647),
  });

  try {
    const response = await request('https://api.vk.com/method/messages.send', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      headersTimeout: 10_000,
      bodyTimeout: 10_000,
    });

    const body = await response.body.text();

    /* ВКонтакте отвечает 200 и на ошибки — разбирать нужно тело. */
    const error = vkError(body);
    if (error) {
      console.error('[vk] messages.send:', body);
      return { ok: false, reason: `ВКонтакте: ${error}` };
    }

    if (response.statusCode >= 400) {
      return { ok: false, reason: `ВКонтакте ответил ${response.statusCode}` };
    }

    return { ok: true };
  } catch (cause) {
    console.error('[vk] не удалось отправить уведомление:', cause);
    return { ok: false, reason: 'не удалось связаться с ВКонтакте' };
  }
}

export async function sendVk(text: string): Promise<VkResult> {
  return sendVkWith(await loadVkConfig(), text);
}

function vkError(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === 'object' && parsed !== null && 'error' in parsed) {
      const error = (parsed as { error: unknown }).error;
      if (typeof error === 'object' && error !== null && 'error_msg' in error) {
        return String((error as { error_msg: unknown }).error_msg);
      }
      return 'неизвестная ошибка';
    }
  } catch {
    /* не JSON — значит и ошибки в формате ВКонтакте там нет */
  }
  return null;
}
