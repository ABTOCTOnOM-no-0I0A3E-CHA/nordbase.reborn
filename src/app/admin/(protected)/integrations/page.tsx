import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { loadTelegramForForm } from '@/lib/telegram-config';
import { loadVkForForm } from '@/lib/vk';
import { AdminHeading, Panel } from '@/components/admin/ui';
import { TelegramForm } from '@/components/admin/TelegramForm';
import { VkForm } from '@/components/admin/VkForm';
import { PushToggle } from '@/components/admin/PushToggle';
import { ActionForm } from '@/components/admin/ActionForm';
import { removeDevice } from '@/lib/admin/push-actions';

export const metadata = { title: 'Интеграции' };

export default async function IntegrationsPage() {
  const [telegram, vk, user, devices] = await Promise.all([
    loadTelegramForForm(),
    loadVkForForm(),
    getSessionUser(),
    db.select().from(pushSubscriptions).orderBy(asc(pushSubscriptions.createdAt)),
  ]);
  const isOwner = user?.role === 'owner';

  return (
    <div className="max-w-2xl">
      <AdminHeading
        title="Уведомления о заявках"
        description="Заявка уходит сразу во все настроенные каналы. Каждый работает сам по себе: если Telegram молчит из-за прокси, ВКонтакте и телефон продолжат получать."
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
        <h2 className="mb-1 text-[15px] font-bold">ВКонтакте</h2>
        <p className="text-ink-3 mb-5 text-[13px]">
          Сообщение приходит вам от имени сообщества. Работает напрямую, без прокси — это самый
          надёжный канал для России.
        </p>
        <VkForm hasToken={vk.hasToken} peerId={vk.peerId} canEdit={isOwner} />
      </Panel>

      <Panel className="mt-6">
        <h2 className="mb-1 text-[15px] font-bold">Уведомления на телефон</h2>
        <p className="text-ink-3 mb-5 text-[13px]">
          Добавьте панель на главный экран — она откроется как обычное приложение, и заявки будут
          падать на экран блокировки. Ни магазина приложений, ни установки не нужно.
        </p>
        <PushToggle />

        {devices.length > 0 ? (
          <div className="border-line mt-5 border-t pt-4">
            <h3 className="text-ink-3 mb-2 text-[12.5px] font-semibold">Подключённые устройства</h3>
            <div className="grid gap-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="border-line bg-bg-2 flex flex-wrap items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-[13.5px]"
                >
                  <b>{device.label || 'устройство'}</b>
                  <span className="text-ink-3 text-[12.5px] tabular-nums">
                    {device.createdAt.toLocaleDateString('ru-RU')}
                  </span>
                  <ActionForm
                    action={removeDevice}
                    success="Устройство отключено"
                    confirm="Больше не присылать уведомления на это устройство?"
                    className="ml-auto"
                  >
                    <input type="hidden" name="id" value={device.id} />
                    <button
                      type="submit"
                      className="border-busy/40 text-busy hover:bg-busy/10 cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                    >
                      Отключить
                    </button>
                  </ActionForm>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Panel>

      <Panel className="mt-6">
        <h2 className="mb-2 text-[15px] font-bold">Как настроить Telegram</h2>
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
