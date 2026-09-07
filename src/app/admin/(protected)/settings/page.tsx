import { loadSettings } from '@/lib/site-data';
import { getSessionUser } from '@/lib/auth/session';
import { saveSettings } from '@/lib/admin/settings-actions';
import { AdminHeading, Field, Input, Panel, Submit, Textarea } from '@/components/admin/ui';
import { MenuFields } from '@/components/admin/MenuFields';
import { NumberField } from '@/components/form/NumberField';
import { ActionForm } from '@/components/admin/ActionForm';
import { CoverField } from '@/components/admin/CoverField';
import { loadMediaOptions } from '@/lib/admin/media-options';

export const metadata = { title: 'Настройки' };

export default async function SettingsPage() {
  const [settings, user, mediaOptions] = await Promise.all([
    loadSettings(),
    getSessionUser(),
    loadMediaOptions(),
  ]);
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
              <NumberField name="lat" step={0.0001} defaultValue={settings.lat} />
            </Field>
            <Field label="Долгота">
              <NumberField name="lng" step={0.0001} defaultValue={settings.lng} />
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
              <Field
                label="Код Яндекс.Вебмастера"
                hint="Из раздела «Настройки → Права доступа». Можно вставить тег целиком — лишнее уберём"
              >
                <Input
                  name="yandexVerification"
                  defaultValue={settings.yandexVerification}
                  placeholder="a1b2c3d4e5f6"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field
                label="Код Google Search Console"
                hint="Способ подтверждения «HTML-тег». Тоже можно целиком"
              >
                <Input
                  name="googleVerification"
                  defaultValue={settings.googleVerification}
                  placeholder="AbC-dEf123"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field
                label="Картинка для мессенджеров"
                hint="Её видят, когда ссылку на сайт кидают в Telegram, WhatsApp или ВКонтакте. Лучше горизонтальную, 1200×630"
              >
                <CoverField name="ogMediaId" defaultValue={settings.ogMediaId} options={mediaOptions} />
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
