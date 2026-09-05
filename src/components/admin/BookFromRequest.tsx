'use client';

import { useActionState } from 'react';
import { bookFromRequest, type BookFromRequestState } from '@/lib/admin/request-actions';
import { Submit } from './ui';

const initial: BookFromRequestState = {};

/* Кнопка «Занять даты» показывает результат: раньше при пересечении дат
   страница просто перерисовывалась, и владелец не понимал, сработало или нет. */
export function BookFromRequest({ requestId }: { requestId: string }) {
  const [state, formAction] = useActionState(bookFromRequest, initial);

  if (state.ok) return <span className="text-aurora text-[13px]">Даты заняты</span>;

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="id" value={requestId} />
      <Submit>Занять даты</Submit>
      {state.error ? <span className="text-busy text-[13px]">{state.error}</span> : null}
    </form>
  );
}
