import 'server-only';
import { env } from '@/env';

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

/* Уведомление не должно ронять отправку заявки: заявка уже в БД и не потеряется,
   поэтому ошибку логируем и возвращаем false, а не бросаем наверх. */
export async function sendTelegram(text: string): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы — не отправляю');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      console.error('[telegram] sendMessage вернул', response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[telegram] не удалось отправить уведомление:', error);
    return false;
  }
}
