import { loadSettings } from '@/lib/site-data';
import { getSessionUser } from '@/lib/auth/session';
import { saveSettings } from '@/lib/admin/settings-actions';
import { AdminHeading, Field, Input, Panel, Submit } from '@/components/admin/ui';
import { MenuFields } from '@/components/admin/MenuFields';

export const metadata = { title: 'Настройки' };

export default async function SettingsPage() {
  const [settings, user] = await Promise.all([loadSettings(), getSessionUser()]);
  const isOwner = user?.role === 'owner';

  return (
    <div className="max-w-2xl">
      <AdminHeading
        title="Настройки сайта"
        description="Контакты и меню подставляются во все страницы сразу."
      />

      {!isOwner ? (
        <Panel className="mb-6">
          <p className="text-amber text-[13.5px]">
            Настройки сайта меняет только владелец. Вы вошли как менеджер — форма ниже сохранена не
            будет.
          </p>
        </Panel>
      ) : null}

      <Panel>
        <form action={saveSettings} className="grid gap-4 sm:grid-cols-2">
          <Field label="Телефон">
            <Input name="phone" defaultValue={settings.phone} />
          </Field>
          <Field label="Адрес">
            <Input name="address" defaultValue={settings.address} />
          </Field>

          <Field label="Ссылка на Telegram">
            <Input name="telegram" defaultValue={settings.telegram} />
          </Field>
          <Field label="Ссылка на WhatsApp">
            <Input name="whatsapp" defaultValue={settings.whatsapp} />
          </Field>
          <Field label="Ссылка на ВКонтакте">
            <Input name="vk" defaultValue={settings.vk} />
          </Field>

          <Field label="Широта">
            <Input name="lat" type="number" step="any" defaultValue={settings.lat} />
          </Field>
          <Field label="Долгота">
            <Input name="lng" type="number" step="any" defaultValue={settings.lng} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Меню сайта" hint="Адрес начинается со слэша: /rybachiy, /ceny">
              <MenuFields defaultValue={settings.menu} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Submit>Сохранить настройки</Submit>
          </div>
        </form>
      </Panel>
    </div>
  );
}
