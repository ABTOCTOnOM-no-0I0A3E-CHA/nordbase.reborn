import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { seasons } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { isUuid } from '@/lib/uuid';
import { loadMediaOptions } from '@/lib/admin/media-options';
import { saveSeason, saveSeasonBlocks } from '@/lib/admin/content-actions';
import { AdminHeading, Field, Input, Panel, Select } from '@/components/admin/ui';
import { CoverField } from '@/components/admin/CoverField';
import { BlockEditor } from '@/components/admin/BlockEditor';
import { EntityForm } from '@/components/admin/EntityForm';

export const metadata = { title: 'Сезон' };

export default async function SeasonEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  /* Опечатка в адресе — это «не найдено», а не ошибка синтаксиса uuid. */
  if (!isNew && !isUuid(id)) notFound();

  const [rows, media] = await Promise.all([
    isNew ? [] : db.select().from(seasons).where(eq(seasons.id, id)).limit(1),
    loadMediaOptions(),
  ]);

  const season = rows[0];
  if (!isNew && !season) notFound();

  return (
    <div>
      <AdminHeading
        title={season ? season.title : 'Новый сезон'}
        description={season ? `/teriberka/${season.slug}` : undefined}
        back={{ href: '/admin/seasons', label: 'Все сезоны' }}
      />

      <Panel className="mb-6">
        <EntityForm
          action={saveSeason}
          submitLabel={season ? 'Сохранить' : 'Создать сезон'}
        >
          <input type="hidden" name="id" value={season?.id ?? ''} />

          <Field label="Название">
            <Input name="title" defaultValue={season?.title ?? ''} required placeholder="Зима" />
          </Field>
          <Field label="Адрес" hint="Латиницей">
            <Input name="slug" pattern="[a-z0-9][a-z0-9\-]*" maxLength={120} defaultValue={season?.slug ?? ''} required placeholder="zima" />
          </Field>

          <Field label="Цвет полоски">
            <Select
              name="accent"
              defaultValue={season?.accent ?? 'ice'}
              options={[
                { value: 'aurora', label: 'Зелёный' },
                { value: 'ice', label: 'Голубой' },
                { value: 'violet', label: 'Фиолетовый' },
                { value: 'amber', label: 'Тёплый' },
              ]}
            />
          </Field>
          <Field label="Состояние">
            <Select
              name="status"
              defaultValue={season?.status ?? 'draft'}
              options={[
                { value: 'draft', label: 'Черновик — гость не увидит' },
                { value: 'published', label: 'На сайте' },
              ]}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Обложка">
              <CoverField name="coverId" defaultValue={season?.coverId ?? null} options={media} />
            </Field>
          </div>

        </EntityForm>
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
