/* Как связаться с гостем.

   Гость сам выбирает канал: звонок берут не все, а в переписке отвечают
   охотнее и быстрее. Владельцу нужно нажать одну кнопку — не переписывать
   номер руками из карточки заявки в мессенджер. */

export type ContactKind = 'phone' | 'telegram' | 'whatsapp' | 'max';

export const CONTACT_LABELS: Record<ContactKind, string> = {
  phone: 'Позвонить',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  max: 'MAX',
};

export const CONTACT_OPTIONS: { value: ContactKind; label: string }[] = [
  { value: 'phone', label: 'Позвоните мне' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'max', label: 'MAX' },
];

/* Что просим ввести под каждый канал. */
export const CONTACT_HINTS: Record<ContactKind, string> = {
  phone: 'Хватит номера телефона выше',
  telegram: 'Ник в Telegram, например @nordbase, или номер',
  whatsapp: 'Номер, к которому привязан WhatsApp',
  max: 'Номер или ник в MAX',
};

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

/* Номер в международном виде без плюса: 8 921 → 7921, как ждут мессенджеры. */
function msisdn(value: string): string {
  const only = digits(value);
  if (only.length === 11 && only.startsWith('8')) return `7${only.slice(1)}`;
  return only;
}

/* Ссылка, открывающая нужный мессенджер или звонок. Пусто — если данных
   не хватает: кнопка, ведущая в никуда, хуже её отсутствия. */
export function contactHref(
  kind: ContactKind,
  value: string,
  phone: string,
): string | null {
  const target = value.trim() || phone.trim();
  if (!target) return null;

  switch (kind) {
    case 'phone':
      return `tel:+${msisdn(phone || target)}`;
    case 'telegram': {
      const nick = target.replace(/^@/, '');
      /* Ник и номер открываются разными адресами. */
      return /^[a-zA-Z][\w]{3,}$/.test(nick)
        ? `https://t.me/${nick}`
        : `https://t.me/+${msisdn(target)}`;
    }
    case 'whatsapp':
      return `https://wa.me/${msisdn(target)}`;
    case 'max':
      /* У MAX нет ссылки на переписку с произвольным номером, поэтому даём
         позвонить — иначе кнопка обманывает. */
      return `tel:+${msisdn(phone || target)}`;
  }
}
