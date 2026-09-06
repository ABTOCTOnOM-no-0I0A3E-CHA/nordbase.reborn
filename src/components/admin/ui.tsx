'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

export const inputClass =
  'w-full rounded-[9px] border border-line-2 bg-bg-2 px-3 py-2 text-[14px] text-ink placeholder:text-ink-3 focus:border-transparent focus:outline-2 focus:outline-aurora';

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
      <span className="text-ink-3 mb-1.5 block text-[12px] font-semibold">{label}</span>
      {children}
      {hint ? <span className="text-ink-3 mt-1 block text-[11.5px]">{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} resize-y ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} select ${props.className ?? ''}`} />;
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
    ghost: 'border border-line-2 text-ink-2 hover:text-ink',
    danger: 'border border-busy/50 text-busy hover:bg-busy/10',
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      className={`cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-semibold disabled:opacity-50 ${look}`}
    >
      {pending ? '…' : children}
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
      className="border-busy/50 text-busy hover:bg-busy/10 cursor-pointer rounded-full border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function AdminHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="text-ink-3 mt-1 text-[14px]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-bg-3 border-line rounded-[14px] border p-5 ${className}`}>{children}</div>
  );
}

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="bg-aurora text-aurora-ink hover:bg-aurora-hi rounded-full px-4 py-2 text-[13.5px] font-semibold"
    >
      {children}
    </Link>
  );
}
