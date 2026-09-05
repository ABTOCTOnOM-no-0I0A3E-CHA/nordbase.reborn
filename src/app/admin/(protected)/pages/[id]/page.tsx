import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { pages, pageVersions } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { loadMediaOptions } from '@/lib/admin/media-options';
import { deletePage, restorePageVersion, savePage, savePageBlocks } from '@/lib/admin/content-actions';
import {
  AdminHeading,
  ConfirmSubmit,
  Field,
  Input,
  Panel,
  Select,
  Submit,
  Textarea,
} from '@/components/admin/ui';
import { BlockEditor } from '@/components/admin/BlockEditor';

export const metadata = { title: 'Страница' };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [rows, media, versions] = await Promise.all([
    db.select().from(pages).where(eq(pages.id, id)).limit(1),
    loadMediaOptions(),
    db
      .select({ id: pageVersions.id, createdAt: pageVersions.createdAt })
      .from(pageVersions)
      .where(eq(pageVersions.pageId, id))
      .orderBy(desc(pageVersions.createdAt))
      .limit(10),
  ]);

  const page = rows[0];
  if (!page) notFound();

  /* Привязываем id к действию: клиентскому редактору достаётся функция,
     принимающая только JSON, и подменить страницу из браузера нельзя. */
  const saveBlocks = savePageBlocks.bind(null, page.id);

  return (
    <div className="max-w-5xl">
      <AdminHeading
        title={page.title}
        description={`Адрес на сайте: /${page.slug}`}
        action={
          <Link href="/admin/pages" className="text-ink-2 hover:text-ink text-[13.5px]">
            ← Все страницы
          </Link>
        }
      />

      <Panel className="mb-6">
        <form action={savePage} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={page.id} />
          <Field label="Название">
            <Input name="title" defaultValue={page.title} required />
          </Field>
          <Field label="Адрес на сайте" hint="Пустое поле — главная страница">
            <Input name="slug" defaultValue={page.slug} />
          </Field>
          <Field label="Заголовок для поиска">
            <Input name="seoTitle" defaultValue={page.seoTitle ?? ''} />
          </Field>
          <Field label="Состояние">
            <Select name="status" defaultValue={page.status}>
              <option value="draft">Черновик</option>
              <option value="published">Опубликована</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Описание для поиска">
              <Textarea name="seoDescription" rows={2} defaultValue={page.seoDescription ?? ''} />
            </Field>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Submit>Сохранить настройки</Submit>
          </div>
        </form>
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
              <form
                key={version.id}
                action={restorePageVersion}
                className="border-line flex items-center gap-3 border-b pb-2 last:border-b-0"
              >
                <input type="hidden" name="versionId" value={version.id} />
                <span className="text-ink-2 text-[13.5px]">
                  {version.createdAt.toLocaleString('ru-RU')}
                </span>
                <span className="ml-auto">
                  <Submit variant="ghost">Восстановить</Submit>
                </span>
              </form>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel className="mt-8">
        <h2 className="mb-3 text-[15px] font-bold">Удаление</h2>
        <form action={deletePage}>
          <input type="hidden" name="id" value={page.id} />
          <ConfirmSubmit message="Удалить страницу вместе со всеми блоками и версиями?">
            Удалить страницу
          </ConfirmSubmit>
        </form>
      </Panel>
    </div>
  );
}
