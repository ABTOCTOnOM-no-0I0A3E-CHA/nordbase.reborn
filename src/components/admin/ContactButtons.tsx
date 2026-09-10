import { CONTACT_LABELS, contactHref, type ContactKind } from '@/lib/contact';

/* Связаться с гостем в один клик.

   Гость сам указал, где ему удобнее отвечать, — сюда и ведём. Телефон
   показываем всегда: звонок работает, даже когда ник неверный. */
export function ContactButtons({
  phone,
  kind,
  value,
  size = 'normal',
}: {
  phone: string;
  kind: ContactKind;
  value: string;
  size?: 'normal' | 'small';
}) {
  const preferred = kind === 'phone' ? null : contactHref(kind, value, phone);
  const call = contactHref('phone', '', phone);

  const base =
    size === 'small'
      ? 'rounded-full border px-3 py-1 text-[12px] font-semibold transition'
      : 'rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition';

  return (
    <span className="flex flex-wrap items-center gap-2">
      {call ? (
        <a
          href={call}
          className={`${base} border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink`}
        >
          Позвонить
        </a>
      ) : null}

      {preferred ? (
        <a
          href={preferred}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} border-aurora/50 text-aurora hover:bg-aurora/10`}
        >
          {CONTACT_LABELS[kind]}
          {value ? ` · ${value}` : ''}
        </a>
      ) : null}
    </span>
  );
}
