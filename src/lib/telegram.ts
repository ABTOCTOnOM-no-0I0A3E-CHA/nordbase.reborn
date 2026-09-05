import 'server-only';
import { ProxyAgent, request, type Dispatcher } from 'undici';
import { env } from '@/env';

/* В России api.telegram.org недоступен напрямую, поэтому есть два пути,
   и они не исключают друг друга:

   TELEGRAM_API_BASE  — свой обратный прокси на зарубежном VPS
                        (обычный nginx, проксирующий на api.telegram.org).
                        Самый надёжный вариант: одна точка отказа, никаких
                        секретов у посредника кроме токена в пути.
   TELEGRAM_PROXY_URL — HTTP(S)-прокси с поддержкой CONNECT.

   SOCKS5 напрямую не поддерживается: undici умеет только HTTP-прокси.
   Если под рукой только SOCKS — поднимите рядом http-мост или используйте
   TELEGRAM_API_BASE. */

/* Экранирование под parse_mode=HTML: имя и комментарий приходят от гостя,
   без этого «<» в тексте уронит отправку сообщения. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export type TelegramField = { label: string; value: string };

export function formatRequest(title: string, fields: TelegramField[]): string {
  const lines = fields
    .filter((f) => f.value.trim().length > 0)
    .map((f) => `<b>${escapeHtml(f.label)}:</b> ${escapeHtml(f.value)}`);
  return [`<b>${escapeHtml(title)}</b>`, '', ...lines].join('\n');
}

/* Агент переиспользуем: новый ProxyAgent на каждую заявку открывал бы
   новое соединение и держал бы сокеты. */
let cachedProxy: { url: string; agent: ProxyAgent } | null = null;

function dispatcher(): Dispatcher | undefined {
  const url = env.TELEGRAM_PROXY_URL;
  if (!url) return undefined;
  if (cachedProxy?.url !== url) {
    cachedProxy = { url, agent: new ProxyAgent(url) };
  }
  return cachedProxy.agent;
}

export type TelegramResult = { ok: boolean; reason?: string };

/* Уведомление не должно ронять отправку заявки: заявка уже в БД и не потеряется,
   поэтому ошибку возвращаем, а не бросаем наверх. */
export async function sendTelegram(text: string): Promise<TelegramResult> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return { ok: false, reason: 'не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID' };
  }

  const base = (env.TELEGRAM_API_BASE ?? 'https://api.telegram.org').replace(/\/$/, '');

  try {
    const response = await request(`${base}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      dispatcher: dispatcher(),
      headersTimeout: 10_000,
      bodyTimeout: 10_000,
    });

    if (response.statusCode >= 400) {
      const details = await response.body.text();
      console.error('[telegram] sendMessage вернул', response.statusCode, details);
      return { ok: false, reason: `Telegram ответил ${response.statusCode}` };
    }

    /* Тело обязательно вычитываем, иначе соединение не вернётся в пул. */
    await response.body.dump();
    return { ok: true };
  } catch (cause) {
    console.error('[telegram] не удалось отправить уведомление:', cause);
    return { ok: false, reason: 'не удалось связаться с Telegram' };
  }
}
