import { loadSettings } from '@/lib/site-data';
import { getSessionUser } from '@/lib/auth/session';
import { saveSettings } from '@/lib/admin/settings-actions';
import { AdminHeading, Field, Input, Panel, Submit, Textarea } from '@/components/admin/ui';
import { MenuFields } from '@/components/admin/MenuFields';
import { ActionForm } from '@/components/admin/ActionForm';

export const metadata = { title: 'Настройки' };

export default async function SettingsPage() {
  const [settings, user] = await Promise.all([loadSettings(), getSessionUser()]);
  const isOwner = user?.role === 'owner';

  return (
    <div className="max-w-2xl">
      <AdminHeading
        title="Настройки сайта"
        description="Название, контакты, меню и тексты кнопок подставляются во все страницы сразу."
      />

      {!isOwner ? (
        <Panel className="mb-6">
          <p className="text-amber text-[13.5px]">
            Настройки сайта меняет только владелец. Вы вошли как менеджер — поля ниже доступны
            только для чтения.
          </p>
        </Panel>
      ) : null}

      <Panel>
        <ActionForm
          action={saveSettings}
          success="Настройки сохранены"
          className="grid gap-4 sm:grid-cols-2"
        >
          {/* Менеджеру форма показывается только для чтения: раньше нажатие
              приводило к странице ошибки от requireOwner. */}
          <fieldset disabled={!isOwner} className="contents">
            <Field label="Название в шапке" hint="Латиницей, как логотип">
              <Input name="brandName" defaultValue={settings.brandName} required />
            </Field>
            <Field label="Название базы" hint="Для подвала и поисковиков">
              <Input name="legalName" defaultValue={settings.legalName} required />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Заголовок сайта для поиска" hint="Показывается во вкладке и в выдаче">
                <Input name="seoTitle" defaultValue={settings.seoTitle} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Описание сайта для поиска">
                <Textarea name="seoDescription" rows={2} defaultValue={settings.seoDescription} />
              </Field>
            </div>

            <Field label="Надпись на кнопке заявки" hint="Одна на весь сайт">
              <Input name="ctaLabel" defaultValue={settings.ctaLabel} required />
            </Field>
            <Field label="Телефон">
              <Input name="phone" defaultValue={settings.phone} />
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
            <Field label="Адрес">
              <Input name="address" defaultValue={settings.address} />
            </Field>

            <Field
              label="Ссылка на отзывы"
              hint="Например, карточка базы на Яндекс.Картах. Пусто — кнопка не показывается"
            >
              <Input name="reviewsUrl" defaultValue={settings.reviewsUrl} placeholder="https://yandex.ru/maps/org/…" />
            </Field>
            <Field label="Подпись у ссылки на отзывы">
              <Input name="reviewsLabel" defaultValue={settings.reviewsLabel} />
            </Field>

            <Field label="Широта">
              <Input name="lat" type="number" step="any" defaultValue={settings.lat} />
            </Field>
            <Field label="Долгота">
              <Input name="lng" type="number" step="any" defaultValue={settings.lng} />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Варианты в поле «Куда едете»"
                hint="По одному на строку. Приходят в заявке как есть"
              >
                <Textarea
                  name="directions"
                  rows={4}
                  defaultValue={settings.directions.join('\n')}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Меню сайта" hint="Адрес начинается со слэша: /rybachiy, /ceny">
                <MenuFields defaultValue={settings.menu} />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Submit>Сохранить настройки</Submit>
            </div>
          </fieldset>
        </ActionForm>
      </Panel>
    </div>
  );
}
