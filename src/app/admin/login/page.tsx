'use client';

import { useFormAction } from '@/lib/use-form-action';
import { login, type LoginState } from './actions';

const initial: LoginState = {};

export default function LoginPage() {
  const { state, pending, onSubmit } = useFormAction(login, initial);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="bg-bg-3 border-line w-full max-w-sm rounded-[18px] border p-8"
      >
        <p className="font-display text-aurora mb-6 text-xs tracking-[0.18em] uppercase">Nordbase</p>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Вход в админку</h1>

        <label className="text-ink-3 mb-2 block text-xs font-semibold">Почта</label>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="bg-bg-2 border-line-2 focus:outline-aurora mb-4 w-full rounded-[10px] border px-3 py-3 focus:outline-2"
        />

        <label className="text-ink-3 mb-2 block text-xs font-semibold">Пароль</label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="bg-bg-2 border-line-2 focus:outline-aurora mb-5 w-full rounded-[10px] border px-3 py-3 focus:outline-2"
        />

        {state.error ? <p className="text-busy mb-4 text-sm">{state.error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="bg-aurora text-aurora-ink hover:bg-aurora-hi w-full rounded-full py-3 font-semibold disabled:opacity-60"
        >
          {pending ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </main>
  );
}
