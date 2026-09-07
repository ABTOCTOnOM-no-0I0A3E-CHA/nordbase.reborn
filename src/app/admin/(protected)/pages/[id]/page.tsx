import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { pages, pageVersions } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { isUuid } from '@/lib/uuid';
import { loadMediaOptions } from '@/lib/admin/media-options';
import { loadSettings } from '@/lib/site-data';
import { deletePage, restorePageVersion, savePage, savePageBlocks } from '@/lib/admin/content-actions';
import {
  AdminHeading,
  ConfirmSubmit,
  Field,
  Input,
  Panel,
  Select,
  Submit,
} from '@/components/admin/ui';
import { BlockEditor } from '@/components/admin/BlockEditor';
import { SnippetPreview } from '@/components/admin/SnippetPreview';
import { ActionForm } from '@/components/admin/ActionForm';
import { EntityForm } from '@/components/admin/EntityForm';

export const metadata = { title: 'Страница' };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  /* Устаревшая закладка или опечатка в адресе не должна давать 500 от
     Postgres — это обычная «страница не найдена». */
  if (!isUuid(id)) notFound();

  const [rows, media, versions, settings] = await Promise.all([
    db.select().from(pages).where(eq(pages.id, id)).limit(1),
    loadMediaOptions(),
    db
      .select({ id: pageVersions.id, createdAt: pageVersions.createdAt })
      .from(pageVersions)
      .where(eq(pageVersions.pageId, id))
      .orderBy(desc(pageVersions.createdAt))
      .limit(10),
    loadSettings(),
  ]);

  const page = rows[0];
  if (!page) notFound();

  /* Привязываем id к действию: клиентскому редактору достаётся функция,
     принимающая только JSON, и подменить страницу из браузера нельзя. */
  const saveBlocks = savePageBlocks.bind(null, page.id);

  return (
    <div>
      <AdminHeading
        title={page.title}
        description={`Адрес на сайте: /${page.slug}`}
        back={{ href: '/admin/pages', label: 'Все страницы' }}
      />

      <Panel className="mb-6">
        <EntityForm action={savePage} submitLabel="Сохранить настройки">
          <input type="hidden" name="id" value={page.id} />
          <Field label="Название">
            <Input name="title" defaultValue={page.title} required maxLength={200} />
          </Field>
          <Field label="Адрес на сайте" hint="Пустое поле — главная страница">
            <Input name="slug" defaultValue={page.slug} pattern="[a-z0-9\-/]*" maxLength={160} />
          </Field>
          <Field label="Состояние">
            <Select
              name="status"
              defaultValue={page.status}
              options={[
                { value: 'draft', label: 'Черновик — на сайте не видна' },
                { value: 'published', label: 'Опубликована' },
              ]}
            />
          </Field>
          <div className="sm:col-span-2">
            <SnippetPreview
              siteName={settings.brandName}
              path={`/${page.slug}`}
              titleName="seoTitle"
              descriptionName="seoDescription"
              defaultTitle={page.seoTitle ?? ''}
              defaultDescription={page.seoDescription ?? ''}
              fallbackTitle={page.title}
            />
          </div>
        </EntityForm>
      </Panel>

      <h2 className="mb-3 text-[17px] font-bold tracking-tight">Блоки страницы</h2>
      <BlockEditor
        initial={parseBlocks(page.body)}
        media={media}
        save={saveBlocks}
        previewHref={`/${page.slug}`}
      />

      {versions.length > 0 ? (
        <Panel className="mt-8">
          <h2 className="mb-1 text-[15px] font-bold">Прошлые версии</h2>
          <p className="text-ink-3 mb-4 text-[13px]">
            Снимок тела страницы сохраняется автоматически перед каждым сохранением блоков.
          </p>
          <div className="grid gap-2">
            {versions.map((version) => (
              <ActionForm
                key={version.id}
                action={restorePageVersion}
                success="Версия восстановлена"
                confirm="Вернуть страницу к этой версии? Текущие блоки будут заменены."
                className="border-line flex items-center gap-3 border-b pb-2 last:border-b-0"
              >
                <input type="hidden" name="versionId" value={version.id} />
                <span className="text-ink-2 text-[13.5px]">
                  {version.createdAt.toLocaleString('ru-RU')}
                </span>
                <span className="ml-auto">
                  <Submit variant="ghost">Восстановить</Submit>
                </span>
              </ActionForm>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel className="mt-8">
        <h2 className="mb-3 text-[15px] font-bold">Удаление</h2>
        <ActionForm
          action={deletePage}
          confirm="Удалить страницу вместе со всеми блоками и версиями?"
        >
          <input type="hidden" name="id" value={page.id} />
          <button
            type="submit"
            className="border-busy/40 text-busy hover:bg-busy/10 hover:border-busy/70 cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
          >
            Удалить страницу
          </button>
        </ActionForm>
      </Panel>
    </div>
  );
}
