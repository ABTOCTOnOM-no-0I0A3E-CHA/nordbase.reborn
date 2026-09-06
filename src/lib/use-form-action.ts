'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';

/* React 19 сбрасывает поля формы после каждого вызова `<form action={fn}>` —
   как это делает обычная HTML-форма. Для форм, которые возвращают ошибку,
   это означает потерю всего введённого: гость заполнил заявку, ошибся в
   телефоне и получил пустые поля. А в настройках интеграции нажатие
   «Проверить связь» обнуляло токен, и следующее «Сохранить» записывало пустоту.

   Поэтому отправляем сами: preventDefault, собираем FormData и вызываем
   действие вручную. Автосброса при таком вызове нет, значения остаются на месте. */

export function useFormAction<S>(
  action: (previous: S, formData: FormData) => Promise<S>,
  initial: S,
  options?: { onSuccess?: (state: S) => void },
) {
  const [state, setState] = useState<S>(initial);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    /* Передаём кнопку-отправитель: только так в FormData попадают её name
       и value, а значит форма может иметь несколько действий. */
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(
      event.currentTarget,
      submitter instanceof HTMLButtonElement ? submitter : undefined,
    );

    startTransition(async () => {
      try {
        const next = await action(state, formData);
        setState(next);
        options?.onSuccess?.(next);
      } catch (cause) {
        /* redirect() внутри действия тоже приходит сюда исключением, но его
           перехватывает и обрабатывает сам Next — до нас долетают только
           настоящие сбои. */
        console.error('[form] действие завершилось ошибкой:', cause);
        setState({
          ...(state as object),
          error: 'Не удалось сохранить. Проверьте связь и попробуйте ещё раз.',
        } as S);
      }
    });
  }

  return { state, pending, onSubmit, setState };
}
