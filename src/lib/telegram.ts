import 'server-only';
import { ProxyAgent, request, type Dispatcher } from 'undici';
import { loadTelegramConfig, type TelegramConfig } from './telegram-config';

/* В России api.telegram.org недоступен напрямую, поэтому есть два пути,
   и они не исключают друг друга:

   «Свой адрес API» — обратный прокси на зарубежном VPS (обычный nginx,
                      проксирующий на api.telegram.org). Самый надёжный
                      вариант: одна точка отказа и никаких посредников
                      в момент отправки.
   «Прокси»         — HTTP(S)-прокси с поддержкой CONNECT.

   SOCKS5 напрямую не поддерживается: undici умеет только HTTP-прокси.
   Если под рукой только SOCKS — поднимите рядом http-мост или укажите
   свой адрес API. И то и другое правится в админке, в «Интеграциях». */

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

function dispatcher(proxyUrl: string): Dispatcher | undefined {
  if (!proxyUrl) return undefined;
  if (cachedProxy?.url !== proxyUrl) {
    cachedProxy = { url: proxyUrl, agent: new ProxyAgent(proxyUrl) };
  }
  return cachedProxy.agent;
}

export type TelegramResult = { ok: boolean; reason?: string };

async function send(config: TelegramConfig, text: string): Promise<TelegramResult> {
  if (!config.botToken || !config.chatId) {
    return { ok: false, reason: 'не заданы токен бота или chat id' };
  }

  const base = (config.apiBase || 'https://api.telegram.org').replace(/\/$/, '');

  try {
    const response = await request(`${base}/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      dispatcher: dispatcher(config.proxyUrl),
      headersTimeout: 10_000,
      bodyTimeout: 10_000,
    });

    if (response.statusCode >= 400) {
      const details = await response.body.text();
      console.error('[telegram] sendMessage вернул', response.statusCode, details);
      /* Описание от Telegram полезно владельцу: «chat not found»,
         «Unauthorized» и подобное сразу говорят, что именно чинить. */
      const description = safeDescription(details);
      return {
        ok: false,
        reason: description
          ? `Telegram: ${description}`
          : `Telegram ответил ${response.statusCode}`,
      };
    }

    /* Тело обязательно вычитываем, иначе соединение не вернётся в пул. */
    await response.body.dump();
    return { ok: true };
  } catch (cause) {
    console.error('[telegram] не удалось отправить уведомление:', cause);
    return {
      ok: false,
      reason: config.proxyUrl
        ? 'не удалось связаться с Telegram через прокси'
        : 'не удалось связаться с Telegram — похоже, нужен прокси или свой адрес API',
    };
  }
}

function safeDescription(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'description' in parsed &&
      typeof (parsed as { description: unknown }).description === 'string'
    ) {
      return (parsed as { description: string }).description;
    }
  } catch {
    /* Telegram не всегда отвечает JSON — тогда просто нечего показать. */
  }
  return '';
}

/* Уведомление не должно ронять отправку заявки: заявка уже в БД и не потеряется,
   поэтому ошибку возвращаем, а не бросаем наверх. */
export async function sendTelegram(text: string): Promise<TelegramResult> {
  return send(await loadTelegramConfig(), text);
}

/* Отправка заданной конфигурацией — для кнопки «Проверить связь»: владелец
   должен увидеть результат до того, как сохранит настройки. */
export function sendTelegramWith(config: TelegramConfig, text: string): Promise<TelegramResult> {
  return send(config, text);
}
