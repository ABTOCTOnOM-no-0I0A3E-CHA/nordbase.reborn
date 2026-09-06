'use client';

import { useFormAction } from '@/lib/use-form-action';
import { useToast } from './Toast';
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
  const toast = useToast();
  const { state, pending, onSubmit } = useFormAction(action, initial, {
    onSuccess: (next) => {
      if (next.error) toast.error(next.error);
      else toast.ok('Сохранено');
    },
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {children}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Submit pending={pending}>{submitLabel}</Submit>
        {state.error ? <span className="text-busy text-[13.5px]">{state.error}</span> : null}
      </div>
    </form>
  );
}
