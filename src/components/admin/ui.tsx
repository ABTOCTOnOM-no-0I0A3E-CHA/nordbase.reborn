'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { Dropdown, type Option } from '@/components/form/Dropdown';

export const inputClass =
  'w-full rounded-[10px] border border-line-2 bg-bg-2 px-3.5 py-2.5 text-[14.5px] text-ink placeholder:text-ink-3 transition hover:border-ink-3/60 focus:border-transparent focus:outline-2 focus:outline-aurora';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-ink mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {hint ? (
        <span className="text-ink-3 mt-1.5 block text-[12px] leading-[1.45]">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} resize-y ${props.className ?? ''}`} />;
}

/* Обёртка над своим выпадающим списком: нативный select рисует система,
   и на тёмной теме он выглядит чужеродно и по-разному в разных браузерах. */
export function Select({
  name,
  options,
  defaultValue,
  value,
  onChange,
  placeholder,
  required,
  id,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}) {
  return (
    <Dropdown
      name={name}
      options={options}
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      id={id}
    />
  );
}

/* По умолчанию состояние берём из useFormStatus — кнопка сама знает, что
   отправка идёт. Но useFormStatus работает только с `<form action={fn}>`;
   формы, которые отправляются вручную (см. useFormAction), передают pending
   сами — иначе кнопка никогда не покажет, что запрос пошёл. */
export function Submit({
  children = 'Сохранить',
  variant = 'solid',
  pending: pendingProp,
}: {
  children?: ReactNode;
  variant?: 'solid' | 'ghost' | 'danger';
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  const look = {
    solid: 'bg-aurora text-aurora-ink hover:bg-aurora-hi',
    ghost: 'border border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink',
    danger: 'border border-busy/50 text-busy hover:bg-busy/10',
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      className={`cursor-pointer rounded-full px-5 py-2.5 text-[14px] font-semibold transition disabled:opacity-50 ${look}`}
    >
      {pending ? 'Сохраняем…' : children}
    </button>
  );
}

/* Удаление необратимо, поэтому спрашиваем подтверждение прямо в браузере:
   отдельный модал ради одной строки того не стоит. */
export function ConfirmSubmit({ message, children }: { message: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className="border-busy/40 text-busy hover:bg-busy/10 hover:border-busy/70 cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/* Шапка раздела: крупный заголовок, объяснение обычным языком и главное
   действие справа. Объяснение обязательно — владелец не разработчик и не
   должен догадываться, зачем нужен раздел. */
export function AdminHeading({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-7">
      {back ? (
        <Link
          href={back.href}
          className="text-ink-3 hover:text-ink mb-3 inline-flex items-center gap-1.5 text-[13px]"
        >
          ← {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">{title}</h1>
          {description ? (
            <p className="text-ink-2 mt-1.5 max-w-[62ch] text-[14px] leading-[1.5]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function Panel({
  children,
  className = '',
  title,
  description,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section className={`bg-bg-3 border-line rounded-[16px] border ${className}`}>
      {title ? (
        <header className="border-line border-b px-5 py-4">
          <h2 className="text-[15px] font-bold">{title}</h2>
          {description ? (
            <p className="text-ink-3 mt-1 text-[13px] leading-[1.45]">{description}</p>
          ) : null}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

/* Пустой раздел — самый частый первый экран у нового владельца. Вместо голого
   «ничего нет» объясняем, что это такое и что нажать. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-line-2 flex flex-col items-center gap-3 rounded-[16px] border border-dashed px-6 py-12 text-center">
      <span className="bg-bg-3 text-ink-3 flex size-11 items-center justify-center rounded-full">
        <Icon name={icon} className="size-5" />
      </span>
      <b className="text-[16px] font-semibold">{title}</b>
      <p className="text-ink-2 max-w-[46ch] text-[13.5px] leading-[1.5]">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = 'solid',
}: {
  href: string;
  children: ReactNode;
  variant?: 'solid' | 'ghost';
}) {
  const look =
    variant === 'solid'
      ? 'bg-aurora text-aurora-ink hover:bg-aurora-hi'
      : 'border border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink';
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold transition ${look}`}
    >
      {children}
    </Link>
  );
}
