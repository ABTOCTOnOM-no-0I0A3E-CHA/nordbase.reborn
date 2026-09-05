import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tourDays, tourStops, tours } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { isUuid } from '@/lib/uuid';
import { loadMediaOptions } from '@/lib/admin/media-options';
import { saveTour, saveTourBlocks, saveTourProgram } from '@/lib/admin/content-actions';
import { AdminHeading, Field, Input, Panel, Select, Textarea } from '@/components/admin/ui';
import { CoverField } from '@/components/admin/CoverField';
import { MetaFields } from '@/components/admin/MetaFields';
import { BlockEditor } from '@/components/admin/BlockEditor';
import { EntityForm } from '@/components/admin/EntityForm';
import { ProgramEditor, type ProgramDay } from '@/components/admin/ProgramEditor';

export const metadata = { title: 'Тур' };

export default async function TourEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  /* Опечатка в адресе — это «не найдено», а не ошибка синтаксиса uuid. */
  if (!isNew && !isUuid(id)) notFound();

  const [rows, media, programRows] = await Promise.all([
    isNew ? [] : db.select().from(tours).where(eq(tours.id, id)).limit(1),
    loadMediaOptions(),
    isNew
      ? []
      : db
          .select({
            dayNo: tourDays.dayNo,
            dayTitle: tourDays.title,
            stopTitle: tourStops.title,
            isFinish: tourStops.isFinish,
          })
          .from(tourDays)
          .leftJoin(tourStops, eq(tourStops.tourDayId, tourDays.id))
          .where(eq(tourDays.tourId, id))
          .orderBy(asc(tourDays.dayNo), asc(tourStops.sort)),
  ]);

  const tour = rows[0];
  if (!isNew && !tour) notFound();

  /* Собираем по dayNo через Map: при разрыве в нумерации (1, 3) массив по
     индексу дал бы дырку, которая после JSON.stringify превращается в null
     и роняет сохранение программы. */
  const byDay = new Map<number, ProgramDay>();
  for (const row of programRows) {
    const day = byDay.get(row.dayNo) ?? { title: row.dayTitle, stops: [] };
    if (row.stopTitle) day.stops.push({ title: row.stopTitle, isFinish: row.isFinish ?? false });
    byDay.set(row.dayNo, day);
  }
  const program: ProgramDay[] = [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, day]) => day);

  return (
    <div className="max-w-5xl">
      <AdminHeading
        title={tour ? tour.title : 'Новый тур'}
        description={tour ? `/rybachiy/tury/${tour.slug}` : undefined}
        action={
          <Link href="/admin/tours" className="text-ink-2 hover:text-ink text-[13.5px]">
            ← Все туры
          </Link>
        }
      />

      <Panel className="mb-6">
        <EntityForm
          action={saveTour}
          submitLabel={tour ? 'Сохранить' : 'Создать тур'}
        >
          <input type="hidden" name="id" value={tour?.id ?? ''} />

          <Field label="Название">
            <Input name="title" defaultValue={tour?.title ?? ''} required />
          </Field>
          <Field label="Адрес" hint="Латиницей">
            <Input name="slug" pattern="[a-z0-9][a-z0-9\-]*" maxLength={120} defaultValue={tour?.slug ?? ''} required placeholder="chetyrehdnevnyy" />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Короткое описание">
              <Textarea name="summary" rows={2} defaultValue={tour?.summary ?? ''} />
            </Field>
          </div>

          <Field label="Дней">
            <Input name="days" type="number" min={1} max={30} defaultValue={tour?.days ?? 2} required />
          </Field>
          <Field label="Цена, ₽" hint="Пусто — цена не показывается">
            <Input name="price" type="number" min={0} defaultValue={tour?.price ?? ''} />
          </Field>

          <Field label="Состояние">
            <Select name="status" defaultValue={tour?.status ?? 'draft'}>
              <option value="draft">Черновик</option>
              <option value="published">На сайте</option>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Обложка">
              <CoverField name="coverId" defaultValue={tour?.coverId ?? null} options={media} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Свои характеристики">
              <MetaFields defaultValue={tour?.meta ?? []} />
            </Field>
          </div>

        </EntityForm>
      </Panel>

      {tour ? (
        <>
          <h2 className="mb-1 text-[17px] font-bold tracking-tight">Программа по дням</h2>
          <p className="text-ink-3 mb-3 text-[13px]">
            Отметка «финиш» выделяет точку — обычно это приезд на базу или возвращение в Титовку.
          </p>
          <ProgramEditor initial={program} save={saveTourProgram.bind(null, tour.id)} />

          <h2 className="mt-8 mb-3 text-[17px] font-bold tracking-tight">
            Дополнительные блоки страницы
          </h2>
          <BlockEditor
            initial={parseBlocks(tour.body)}
            media={media}
            save={saveTourBlocks.bind(null, tour.id)}
            previewHref={`/rybachiy/tury/${tour.slug}`}
          />
        </>
      ) : null}
    </div>
  );
}
