import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { houses } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { loadMediaOptions } from '@/lib/admin/media-options';
import { saveHouse, saveHouseBlocks } from '@/lib/admin/content-actions';
import { AdminHeading, Field, Input, Panel, Select, Submit, Textarea } from '@/components/admin/ui';
import { CoverField } from '@/components/admin/CoverField';
import { MetaFields } from '@/components/admin/MetaFields';
import { BlockEditor } from '@/components/admin/BlockEditor';

export const metadata = { title: 'Домик' };

/* Заведение нового домика и правка существующего — одна форма: отличается
   только тем, что у нового нет id и нечего показывать в блочном редакторе. */
export default async function HouseEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';

  const [rows, media] = await Promise.all([
    isNew ? [] : db.select().from(houses).where(eq(houses.id, id)).limit(1),
    loadMediaOptions(),
  ]);

  const house = rows[0];
  if (!isNew && !house) notFound();

  return (
    <div className="max-w-5xl">
      <AdminHeading
        title={house ? house.title : 'Новый домик'}
        description={house ? `/rybachiy/doma/${house.slug}` : 'Заполните карточку и сохраните.'}
        action={
          <Link href="/admin/houses" className="text-ink-2 hover:text-ink text-[13.5px]">
            ← Все домики
          </Link>
        }
      />

      <Panel className="mb-6">
        <form action={saveHouse} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={house?.id ?? ''} />

          <Field label="Название">
            <Input name="title" defaultValue={house?.title ?? ''} required placeholder="Эко-дом №4" />
          </Field>
          <Field label="Адрес" hint="Латиницей, попадёт в ссылку">
            <Input name="slug" defaultValue={house?.slug ?? ''} required placeholder="dom-4" />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Короткое описание" hint="Показывается в карточке на странице базы">
              <Textarea name="summary" rows={2} defaultValue={house?.summary ?? ''} />
            </Field>
          </div>

          <Field label="Вместимость, гостей">
            <Input name="capacity" type="number" min={1} defaultValue={house?.capacity ?? 4} required />
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

          <div className="sm:col-span-2">
            <Submit>{house ? 'Сохранить' : 'Создать домик'}</Submit>
          </div>
        </form>
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
