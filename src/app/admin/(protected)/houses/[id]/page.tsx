import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { houses } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { isUuid } from '@/lib/uuid';
import { loadMediaOptions } from '@/lib/admin/media-options';
import { saveHouse, saveHouseBlocks } from '@/lib/admin/content-actions';
import { AdminHeading, Field, Input, Panel, Select, Textarea } from '@/components/admin/ui';
import { CoverField } from '@/components/admin/CoverField';
import { MetaFields } from '@/components/admin/MetaFields';
import { BlockEditor } from '@/components/admin/BlockEditor';
import { EntityForm } from '@/components/admin/EntityForm';

export const metadata = { title: 'Домик' };

/* Заведение нового домика и правка существующего — одна форма: отличается
   только тем, что у нового нет id и нечего показывать в блочном редакторе. */
export default async function HouseEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  /* Опечатка в адресе — это «не найдено», а не ошибка синтаксиса uuid. */
  if (!isNew && !isUuid(id)) notFound();

  const [rows, media] = await Promise.all([
    isNew ? [] : db.select().from(houses).where(eq(houses.id, id)).limit(1),
    loadMediaOptions(),
  ]);

  const house = rows[0];
  if (!isNew && !house) notFound();

  return (
    <div>
      <AdminHeading
        title={house ? house.title : 'Новый домик'}
        description={house ? `/rybachiy/doma/${house.slug}` : 'Заполните карточку и сохраните.'}
        back={{ href: '/admin/houses', label: 'Все домики' }}
      />

      <Panel className="mb-6">
        <EntityForm
          action={saveHouse}
          submitLabel={house ? 'Сохранить' : 'Создать домик'}
        >
          <input type="hidden" name="id" value={house?.id ?? ''} />

          <Field label="Название">
            <Input name="title" defaultValue={house?.title ?? ''} required placeholder="Эко-дом №4" />
          </Field>
          <Field label="Адрес" hint="Латиницей, попадёт в ссылку">
            <Input name="slug" pattern="[a-z0-9][a-z0-9\-]*" maxLength={120} defaultValue={house?.slug ?? ''} required placeholder="dom-4" />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Короткое описание" hint="Показывается в карточке на странице базы">
              <Textarea name="summary" rows={2} defaultValue={house?.summary ?? ''} />
            </Field>
          </div>

          <Field label="Вместимость, гостей">
            <Input name="capacity" type="number" min={1} max={30} defaultValue={house?.capacity ?? 4} required />
          </Field>
          <Field label="Цена, ₽ за человека в сутки" hint="Пусто — цена не показывается">
            <Input name="pricePerNight" type="number" min={0} defaultValue={house?.pricePerNight ?? ''} />
          </Field>

          <Field label="Состояние">
            <Select name="status" defaultValue={house?.status ?? 'draft'}>
              <option value="draft">Черновик</option>
              <option value="published">На сайте</option>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Обложка">
              <CoverField name="coverId" defaultValue={house?.coverId ?? null} options={media} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Свои характеристики"
              hint="Показываются плитками в карточке домика: «Wi-Fi — есть», «Мангал — есть»"
            >
              <MetaFields defaultValue={house?.meta ?? []} />
            </Field>
          </div>

        </EntityForm>
      </Panel>

      {house ? (
        <>
          <h2 className="mb-3 text-[17px] font-bold tracking-tight">Блоки страницы домика</h2>
          <BlockEditor
            initial={parseBlocks(house.body)}
            media={media}
            save={saveHouseBlocks.bind(null, house.id)}
            previewHref={`/rybachiy/doma/${house.slug}`}
          />
        </>
      ) : null}
    </div>
  );
}
