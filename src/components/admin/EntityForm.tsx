'use client';

import { useActionState } from 'react';
import type { ReactNode } from 'react';
import type { FormState } from '@/lib/admin/content-actions';
import { Submit } from './ui';

const initial: FormState = {};

/* Обёртка для форм контента: показывает отказ сервера рядом с кнопкой.
   Без неё отклонённая схема или занятый адрес превращались в страницу 500
   и потерянную форму. */
export function EntityForm({
  action,
  children,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {children}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Submit>{submitLabel}</Submit>
        {state.error ? <span className="text-busy text-[13.5px]">{state.error}</span> : null}
      </div>
    </form>
  );
}
