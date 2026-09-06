'use client';

import { useState } from 'react';
import {
  saveTelegram,
  testTelegram,
  type IntegrationState,
} from '@/lib/admin/integration-actions';
import { useFormAction } from '@/lib/use-form-action';
import { Field, Input } from './ui';

const initial: IntegrationState = {};

/* Одна форма на два действия: сохранить и проверить связь. Проверка работает
   по тому, что введено сейчас, — прокси подбирают методом тыка, и сохранять
   заведомо нерабочее значение незачем. */
export function TelegramForm({
  hasToken,
  tokenFromEnv,
  chatId,
  apiBase,
  proxyUrl,
  canEdit,
}: {
  hasToken: boolean;
  tokenFromEnv: boolean;
  chatId: string;
  apiBase: string;
  proxyUrl: string;
  canEdit: boolean;
}) {
  /* Какое действие выполнять, говорит сама нажатая кнопка через поле intent:
     состояние тут не нужно и не даёт шанса на рассинхрон. */
  const [mode, setMode] = useState<'save' | 'test'>('save');
  const { state, pending, onSubmit } = useFormAction(
    (previous: IntegrationState, formData: FormData) =>
      formData.get('intent') === 'test'
        ? testTelegram(previous, formData)
        : saveTelegram(previous, formData),
    initial,
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <fieldset disabled={!canEdit} className="contents">
        <div className="sm:col-span-2">
          <Field
            label="Токен бота"
            hint={
              hasToken
                ? tokenFromEnv
                  ? 'Задан через переменные окружения. Введите здесь, чтобы перекрыть.'
                  : 'Токен сохранён. Оставьте пустым, чтобы не менять.'
                : 'Получите у @BotFather и вставьте сюда.'
            }
          >
            <Input
              name="botToken"
              type="password"
              autoComplete="off"
              placeholder={hasToken ? '••••••••••  (сохранён)' : '1234567890:AA…'}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field
            label="Chat ID"
            hint="Куда слать заявки: ваш личный чат с ботом или id группы. Узнать можно у @userinfobot."
          >
            <Input name="chatId" defaultValue={chatId} placeholder="123456789" />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <p className="text-ink-3 border-line mt-2 border-t pt-4 text-[13px]">
            Telegram недоступен из России напрямую. Достаточно заполнить одно поле из двух ниже.
          </p>
        </div>

        <div className="sm:col-span-2">
          <Field
            label="Свой адрес API"
            hint="Обратный прокси на зарубежном сервере, который проксирует на api.telegram.org. Самый надёжный путь."
          >
            <Input name="apiBase" defaultValue={apiBase} placeholder="https://tg.example.com" />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field
            label="HTTP-прокси"
            hint="Формат: http://логин:пароль@адрес:порт. SOCKS5 не поддерживается — для него нужен свой адрес API."
          >
            <Input
              name="proxyUrl"
              defaultValue={proxyUrl}
              placeholder="http://user:pass@1.2.3.4:8080"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            name="intent"
            value="save"
            onClick={() => setMode('save')}
            disabled={pending}
            className="bg-aurora text-aurora-ink hover:bg-aurora-hi cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-semibold disabled:opacity-50"
          >
            {pending && mode === 'save' ? '…' : 'Сохранить'}
          </button>
          {/* Проверяем то, что введено сейчас, не сохраняя заведомо нерабочее. */}
          <button
            type="submit"
            name="intent"
            value="test"
            onClick={() => setMode('test')}
            disabled={pending}
            className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-full border px-4 py-2 text-[13.5px] font-semibold disabled:opacity-50"
          >
            {pending && mode === 'test' ? 'Отправляем…' : 'Проверить связь'}
          </button>
          {state.ok ? <span className="text-aurora text-[13.5px]">{state.ok}</span> : null}
          {state.error ? <span className="text-busy text-[13.5px]">{state.error}</span> : null}
        </div>
      </fieldset>
    </form>
  );
}
