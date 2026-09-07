'use client';

import { useFormAction } from '@/lib/use-form-action';
import { useToast } from './Toast';
import { saveVk, testVk, type IntegrationState } from '@/lib/admin/integration-actions';
import { Field, Input, Submit } from './ui';

const initial: IntegrationState = {};

/* Ключ сообщества обратно в форму не возвращается: раз попав в браузер, он
   виден в исходном коде страницы. Пустое поле означает «оставить прежний». */
export function VkForm({
  hasToken,
  peerId,
  canEdit,
}: {
  hasToken: boolean;
  peerId: string;
  canEdit: boolean;
}) {
  const toast = useToast();

  const save = useFormAction(saveVk, initial, {
    onSuccess: (next) => (next.error ? toast.error(next.error) : toast.ok(next.ok ?? 'Сохранено')),
  });

  const check = useFormAction(testVk, initial, {
    onSuccess: (next) =>
      next.error ? toast.error(next.error) : toast.ok(next.ok ?? 'Сообщение отправлено'),
  });

  return (
    <form
      onSubmit={(event) => {
        const intent = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value');
        if (intent === 'test') check.onSubmit(event);
        else save.onSubmit(event);
      }}
      className="grid gap-4"
    >
      <Field
        label="Ключ доступа сообщества"
        hint={
          hasToken
            ? 'Ключ сохранён. Оставьте поле пустым, чтобы не менять его'
            : 'Управление сообществом → Работа с API → создать ключ с правом «Сообщения»'
        }
      >
        <Input
          name="token"
          type="password"
          autoComplete="off"
          disabled={!canEdit}
          placeholder={hasToken ? '••••••••' : 'vk1.a.…'}
        />
      </Field>

      <Field
        label="Ваш id ВКонтакте"
        hint="Число из адреса вашей страницы. Один раз напишите сообществу — иначе ВКонтакте не даст ему написать вам первым"
      >
        <Input name="peerId" defaultValue={peerId} disabled={!canEdit} placeholder="123456789" />
      </Field>

      {canEdit ? (
        <div className="flex flex-wrap gap-3">
          <Submit pending={save.pending}>Сохранить</Submit>
          <button
            type="submit"
            value="test"
            disabled={check.pending}
            className="border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink cursor-pointer rounded-full border px-5 py-2.5 text-[14px] font-semibold transition disabled:opacity-50"
          >
            {check.pending ? 'Отправляем…' : 'Проверить связь'}
          </button>
        </div>
      ) : null}
    </form>
  );
}
