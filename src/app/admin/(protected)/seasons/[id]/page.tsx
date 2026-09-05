import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { seasons } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { loadMediaOptions } from '@/lib/admin/media-options';
import { saveSeason, saveSeasonBlocks } from '@/lib/admin/content-actions';
import { AdminHeading, Field, Input, Panel, Select, Submit } from '@/components/admin/ui';
import { CoverField } from '@/components/admin/CoverField';
import { BlockEditor } from '@/components/admin/BlockEditor';

export const metadata = { title: 'Сезон' };

export default async function SeasonEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';

  const [rows, media] = await Promise.all([
    isNew ? [] : db.select().from(seasons).where(eq(seasons.id, id)).limit(1),
    loadMediaOptions(),
  ]);

  const season = rows[0];
  if (!isNew && !season) notFound();

  return (
    <div className="max-w-5xl">
      <AdminHeading
        title={season ? season.title : 'Новый сезон'}
        description={season ? `/teriberka/${season.slug}` : undefined}
        action={
          <Link href="/admin/seasons" className="text-ink-2 hover:text-ink text-[13.5px]">
            ← Все сезоны
          </Link>
        }
      />

      <Panel className="mb-6">
        <form action={saveSeason} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={season?.id ?? ''} />

          <Field label="Название">
            <Input name="title" defaultValue={season?.title ?? ''} required placeholder="Зима" />
          </Field>
          <Field label="Адрес" hint="Латиницей">
            <Input name="slug" defaultValue={season?.slug ?? ''} required placeholder="zima" />
          </Field>

          <Field label="Цвет полоски">
            <Select name="accent" defaultValue={season?.accent ?? 'ice'}>
              <option value="aurora">Зелёный</option>
              <option value="ice">Голубой</option>
              <option value="violet">Фиолетовый</option>
              <option value="amber">Тёплый</option>
            </Select>
          </Field>
          <Field label="Состояние">
            <Select name="status" defaultValue={season?.status ?? 'draft'}>
              <option value="draft">Черновик</option>
              <option value="published">На сайте</option>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Обложка">
              <CoverField name="coverId" defaultValue={season?.coverId ?? null} options={media} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Submit>{season ? 'Сохранить' : 'Создать сезон'}</Submit>
          </div>
        </form>
      </Panel>

      {season ? (
        <>
          <h2 className="mb-3 text-[17px] font-bold tracking-tight">Блоки страницы сезона</h2>
          <BlockEditor
            initial={parseBlocks(season.body)}
            media={media}
            save={saveSeasonBlocks.bind(null, season.id)}
            previewHref={`/teriberka/${season.slug}`}
          />
        </>
      ) : null}
    </div>
  );
}
