'use client';

import { useFormAction } from '@/lib/use-form-action';
import { bookFromRequest, type BookFromRequestState } from '@/lib/admin/request-actions';
import { Submit } from './ui';

const initial: BookFromRequestState = {};

/* Кнопка «Занять даты» показывает результат: раньше при пересечении дат
   страница просто перерисовывалась, и владелец не понимал, сработало или нет. */
export function BookFromRequest({ requestId }: { requestId: string }) {
  const { state, pending, onSubmit } = useFormAction(bookFromRequest, initial);

  if (state.ok) return <span className="text-aurora text-[13px]">Даты заняты</span>;

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3">
      <input type="hidden" name="id" value={requestId} />
      <Submit pending={pending}>Занять даты</Submit>
      {state.error ? <span className="text-busy text-[13px]">{state.error}</span> : null}
    </form>
  );
}
