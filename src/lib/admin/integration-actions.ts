'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { requireOwner } from '@/lib/auth/guard';
import { TELEGRAM_KEY, loadTelegramConfig } from '@/lib/telegram-config';
import { sendTelegramWith } from '@/lib/telegram';

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
