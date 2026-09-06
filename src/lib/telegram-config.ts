import 'server-only';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { env } from '@/env';

/* Настройки Telegram лежат отдельной строкой в settings, а не вместе с
   настройками сайта: там токен, и эти данные не должны случайно уехать
   в клиентский бандл вместе с меню и контактами.

   Значения из админки перекрывают переменные окружения. Так у разработчика
   есть возможность задать всё при деплое, а у владельца — поменять прокси
   самому, когда провайдер сменится, не трогая сервер. */

export const TELEGRAM_KEY = 'telegram';

const schema = z.object({
  botToken: z.string().catch(''),
  chatId: z.string().catch(''),
  apiBase: z.string().catch(''),
  proxyUrl: z.string().catch(''),
});

export type TelegramConfig = z.infer<typeof schema>;

export async function loadTelegramConfig(): Promise<TelegramConfig> {
  const rows = await db.select().from(settings).where(eq(settings.key, TELEGRAM_KEY)).limit(1);
  const stored = schema.safeParse(rows[0]?.value ?? {});
  const saved = stored.success ? stored.data : { botToken: '', chatId: '', apiBase: '', proxyUrl: '' };

  return {
    botToken: saved.botToken || (env.TELEGRAM_BOT_TOKEN ?? ''),
    chatId: saved.chatId || (env.TELEGRAM_CHAT_ID ?? ''),
    apiBase: saved.apiBase || (env.TELEGRAM_API_BASE ?? ''),
    proxyUrl: saved.proxyUrl || (env.TELEGRAM_PROXY_URL ?? ''),
  };
}

/* Для формы в админке: показываем, что задано, но не сам токен. */
export async function loadTelegramForForm(): Promise<{
  hasToken: boolean;
  tokenFromEnv: boolean;
  chatId: string;
  apiBase: string;
  proxyUrl: string;
}> {
  const rows = await db.select().from(settings).where(eq(settings.key, TELEGRAM_KEY)).limit(1);
  const stored = schema.safeParse(rows[0]?.value ?? {});
  const saved = stored.success ? stored.data : { botToken: '', chatId: '', apiBase: '', proxyUrl: '' };

  return {
    hasToken: Boolean(saved.botToken || env.TELEGRAM_BOT_TOKEN),
    tokenFromEnv: !saved.botToken && Boolean(env.TELEGRAM_BOT_TOKEN),
    chatId: saved.chatId || (env.TELEGRAM_CHAT_ID ?? ''),
    apiBase: saved.apiBase || (env.TELEGRAM_API_BASE ?? ''),
    proxyUrl: saved.proxyUrl || (env.TELEGRAM_PROXY_URL ?? ''),
  };
}
