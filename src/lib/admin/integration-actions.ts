'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { requireOwner } from '@/lib/auth/guard';
import { TELEGRAM_KEY, loadTelegramConfig } from '@/lib/telegram-config';
import { sendTelegramWith } from '@/lib/telegram';
import { VK_KEY, loadVkConfig, sendVkWith } from '@/lib/vk';

/* Адрес API и прокси — это URL. Пустая строка означает «не задано». */
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), {
    message: 'Адрес должен начинаться с http:// или https://',
  });

const schema = z.object({
  /* Пусто — значит «не менять»: в форме токен не показываем. */
  botToken: z.string().trim().max(200),
  chatId: z.string().trim().max(60),
  apiBase: optionalUrl,
  proxyUrl: optionalUrl,
});

export type IntegrationState = { error?: string; ok?: string };

async function readForm(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Проверьте поля' } as const;
  }
  return { data: parsed.data } as const;
}

export async function saveTelegram(
  _prev: IntegrationState,
  formData: FormData,
): Promise<IntegrationState> {
  /* Токен бота — секрет, поэтому только владелец. */
  await requireOwner();

  const result = await readForm(formData);
  if ('error' in result) return { error: result.error };

  const rows = await db.select().from(settings).where(eq(settings.key, TELEGRAM_KEY)).limit(1);
  const previous = (rows[0]?.value ?? {}) as { botToken?: unknown };
  const previousToken = typeof previous.botToken === 'string' ? previous.botToken : '';

  const value = {
    /* Пустое поле токена — «оставить как было»: иначе владелец затирал бы
       рабочий токен каждый раз, когда меняет прокси. */
    botToken: result.data.botToken || previousToken,
    chatId: result.data.chatId,
    apiBase: result.data.apiBase,
    proxyUrl: result.data.proxyUrl,
  };

  await db
    .insert(settings)
    .values({ key: TELEGRAM_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });

  revalidatePath('/admin/integrations');
  return { ok: 'Настройки сохранены' };
}

/* Проверка связи по тому, что введено в форме прямо сейчас, — до сохранения.
   Иначе владелец подбирал бы прокси вслепую. */
export async function testTelegram(
  _prev: IntegrationState,
  formData: FormData,
): Promise<IntegrationState> {
  await requireOwner();

  const result = await readForm(formData);
  if ('error' in result) return { error: result.error };

  const saved = await loadTelegramConfig();
  const config = {
    botToken: result.data.botToken || saved.botToken,
    chatId: result.data.chatId || saved.chatId,
    apiBase: result.data.apiBase,
    proxyUrl: result.data.proxyUrl,
  };

  if (!config.botToken) return { error: 'Сначала укажите токен бота' };
  if (!config.chatId) return { error: 'Сначала укажите chat id' };

  const sent = await sendTelegramWith(
    config,
    '<b>Проверка связи</b>\n\nЕсли вы видите это сообщение, заявки с сайта будут приходить сюда.',
  );

  return sent.ok
    ? { ok: 'Сообщение отправлено — проверьте чат' }
    : { error: sent.reason ?? 'Не удалось отправить' };
}


/* ------------------------------------------------------------ ВКонтакте */

const vkSchema = z.object({
  token: z.string().trim().max(300).default(''),
  peerId: z.string().trim().regex(/^\d*$/, 'Id получателя — это число').max(30).default(''),
});

export async function saveVk(
  _prev: IntegrationState,
  formData: FormData,
): Promise<IntegrationState> {
  /* Ключ сообщества — такой же секрет, как токен бота. */
  await requireOwner();

  const parsed = vkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Проверьте поля' };

  const previous = await loadVkConfig();
  const value = {
    /* Пустое поле ключа — «оставить как было», как и у Telegram. */
    token: parsed.data.token || previous.token,
    peerId: parsed.data.peerId,
  };

  await db
    .insert(settings)
    .values({ key: VK_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });

  revalidatePath('/admin/integrations');
  return { ok: 'Настройки сохранены' };
}

export async function testVk(
  _prev: IntegrationState,
  formData: FormData,
): Promise<IntegrationState> {
  await requireOwner();

  const parsed = vkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Проверьте поля' };

  const previous = await loadVkConfig();
  const config = {
    token: parsed.data.token || previous.token,
    peerId: parsed.data.peerId || previous.peerId,
  };

  const sent = await sendVkWith(config, 'Проверка связи. Так будут приходить заявки с сайта.');
  return sent.ok
    ? { ok: 'Сообщение отправлено — проверьте диалог с сообществом' }
    : { error: sent.reason ?? 'Не удалось отправить' };
}
