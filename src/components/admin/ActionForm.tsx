'use client';

import { useTransition } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useToast } from './Toast';

/* Обёртка для форм, чьи действия ничего не возвращают (сохранить строку
   справочника, изменить порядок, удалить). Отправляем вручную, чтобы поймать
   момент завершения и показать подтверждение — сам по себе Server Action
   молча перерисовывает страницу, и понять, сработало ли, невозможно. */

export function ActionForm({
  action,
  children,
  success,
  className,
  confirm,
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  /* Что показать во всплывашке при успехе. Пусто — не показывать. */
  success?: string;
  className?: string;
  /* Вопрос перед выполнением — для необратимых действий. */
  confirm?: string;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;

    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(
      event.currentTarget,
      submitter instanceof HTMLButtonElement ? submitter : undefined,
    );

    startTransition(async () => {
      try {
        await action(formData);
        if (success) toast.ok(success);
      } catch (cause) {
        /* redirect() внутри действия тоже прилетает исключением, но его
           перехватывает сам Next — до нас долетают только настоящие сбои. */
        console.error('[form] действие завершилось ошибкой:', cause);
        toast.error('Не удалось сохранить. Проверьте связь и попробуйте ещё раз.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
    </form>
  );
}
