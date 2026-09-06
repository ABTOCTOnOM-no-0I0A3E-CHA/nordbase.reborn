import { getSessionUser } from '@/lib/auth/session';
import { loadTelegramForForm } from '@/lib/telegram-config';
import { AdminHeading, Panel } from '@/components/admin/ui';
import { TelegramForm } from '@/components/admin/TelegramForm';

export const metadata = { title: 'Интеграции' };

export default async function IntegrationsPage() {
  const [telegram, user] = await Promise.all([loadTelegramForForm(), getSessionUser()]);
  const isOwner = user?.role === 'owner';

  return (
    <div className="max-w-2xl">
      <AdminHeading
        title="Интеграции"
        description="Куда уходят заявки с сайта."
      />

      {!isOwner ? (
        <Panel className="mb-6">
          <p className="text-amber text-[13.5px]">
            Здесь хранится токен бота, поэтому менять настройки может только владелец.
          </p>
        </Panel>
      ) : null}

      <Panel>
        <h2 className="mb-1 text-[15px] font-bold">Telegram</h2>
        <p className="text-ink-3 mb-5 text-[13px]">
          Заявки приходят в чат сразу после отправки формы. Даже если уведомление не дойдёт,
          заявка сохранится и будет видна в разделе «Заявки» — ничего не потеряется.
        </p>
        <TelegramForm
          hasToken={telegram.hasToken}
          tokenFromEnv={telegram.tokenFromEnv}
          chatId={telegram.chatId}
          apiBase={telegram.apiBase}
          proxyUrl={telegram.proxyUrl}
          canEdit={isOwner}
        />
      </Panel>

      <Panel className="mt-6">
        <h2 className="mb-2 text-[15px] font-bold">Как настроить</h2>
        <ol className="text-ink-2 grid list-decimal gap-2 pl-5 text-[13.5px]">
          <li>
            Напишите <b>@BotFather</b> в Telegram, командой <code>/newbot</code> создайте бота
            и скопируйте токен.
          </li>
          <li>Напишите своему боту любое сообщение — без этого он не сможет вам ответить.</li>
          <li>
            Узнайте свой chat id у <b>@userinfobot</b> и вставьте его выше.
          </li>
          <li>
            Заполните «Свой адрес API» либо «HTTP-прокси» — из России без этого не работает.
          </li>
          <li>Нажмите «Проверить связь»: в чат придёт тестовое сообщение.</li>
        </ol>
      </Panel>
    </div>
  );
}
