'use client';

import { changePassword, type AccountState } from '@/lib/admin/account-actions';
import { useFormAction } from '@/lib/use-form-action';
import { useToast } from './Toast';
import { Field, Input, Submit } from './ui';

const initial: AccountState = {};

export function PasswordForm({ email }: { email: string }) {
  const toast = useToast();
  const { state, pending, onSubmit } = useFormAction(changePassword, initial, {
    onSuccess: (next) => {
      if (next.error) toast.error(next.error);
      else if (next.ok) toast.ok(next.ok);
    },
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Почта для входа" hint="Меняется только через сервер">
          <Input value={email} readOnly disabled />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field label="Текущий пароль">
          <Input name="current" type="password" autoComplete="current-password" required />
        </Field>
      </div>

      <Field label="Новый пароль" hint="Не короче 10 символов">
        <Input name="next" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Ещё раз">
        <Input name="repeat" type="password" autoComplete="new-password" required minLength={10} />
      </Field>

      {state.error ? (
        <p className="text-busy sm:col-span-2 text-[13.5px]">{state.error}</p>
      ) : state.ok ? (
        <p className="text-aurora sm:col-span-2 text-[13.5px]">{state.ok}</p>
      ) : null}

      <div className="sm:col-span-2">
        <Submit pending={pending}>Сменить пароль</Submit>
      </div>
    </form>
  );
}
