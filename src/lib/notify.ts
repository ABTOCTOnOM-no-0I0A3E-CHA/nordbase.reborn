import 'server-only';
import { formatRequest, sendTelegram, type TelegramField } from './telegram';
import { sendVk } from './vk';
import { sendPush } from './push';

/* Один вход для всех каналов уведомлений.

   Каналы независимы: заявка приходит туда, где владелец сидит, а не туда, где
   у нас настроено. Если Telegram отвалился вместе с прокси, ВКонтакте и push
   продолжают работать — и наоборот. Незаданный канал молча пропускается, это
   не ошибка, а «им не пользуются».

   Заявка к моменту рассылки уже в базе, поэтому ни одна неудача здесь не
   должна касаться гостя: он своё дело сделал. */

export type NotifyField = TelegramField;

export type NotifyResult = {
  /* Ушло хоть куда-нибудь. */
  ok: boolean;
  delivered: string[];
  failed: { channel: string; reason: string }[];
};

/* Для ВКонтакте и push разметка не нужна — там обычный текст. */
function plain(title: string, fields: NotifyField[]): string {
  const lines = fields
    .filter((field) => field.value.trim().length > 0)
    .map((field) => `${field.label}: ${field.value}`);
  return [title, '', ...lines].join('\n');
}

/* Короткая строка для экрана блокировки: там видно две-три строки, не больше. */
function short(fields: NotifyField[]): string {
  const wanted = ['Имя', 'Телефон', 'Даты', 'Гостей'];
  return fields
    .filter((field) => wanted.includes(field.label) && field.value.trim().length > 0)
    .map((field) => field.value)
    .join(' · ');
}

export async function notifyAll(
  title: string,
  fields: NotifyField[],
  /* Куда открыть панель по нажатию на уведомление. По умолчанию — список
     заявок; вызывающий передаёт адрес с якорем на конкретную. */
  url?: string,
): Promise<NotifyResult> {
  const [telegram, vk, push] = await Promise.all([
    sendTelegram(formatRequest(title, fields)),
    sendVk(plain(title, fields)),
    sendPush(title, short(fields), url),
  ]);

  const delivered: string[] = [];
  const failed: { channel: string; reason: string }[] = [];

  const record = (channel: string, result: { ok: boolean; reason?: string }) => {
    if (result.ok) delivered.push(channel);
    else failed.push({ channel, reason: result.reason ?? 'неизвестная причина' });
  };

  record('Telegram', telegram);
  record('ВКонтакте', vk);
  record('Push', push);

  return { ok: delivered.length > 0, delivered, failed };
}
