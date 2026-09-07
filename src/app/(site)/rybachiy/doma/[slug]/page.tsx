import type { Metadata } from 'next';
import { mediaKey, pageMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { houseMedia, houses, media } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { loadBlockData, loadSettings, parseMeta } from '@/lib/site-data';
import { BlockList } from '@/components/blocks/render';
import { Picture } from '@/components/blocks/Picture';
import { Btn, Card, Eyebrow, Section } from '@/components/site/ui';
import { BreadcrumbsLd, HouseLd } from '@/components/site/Schema';
import { mediaUrl } from '@/lib/media-url';

type Params = { slug: string };

async function findHouse(slug: string) {
  const rows = await db
    .select()
    .from(houses)
    .where(and(eq(houses.slug, slug), eq(houses.status, 'published')))
    .limit(1);
  return rows[0];
}

/* Рендерим на каждый запрос: контент правится в админке, и страница обязана
   показывать текущее состояние, а не снимок на момент сборки. Нагрузка тут
   в единицы запросов в минуту, кешировать нечего. */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const house = await findHouse((await params).slug);
  if (!house) return {};
  return pageMetadata({
    title: house.title,
    description: house.summary,
    path: `/rybachiy/doma/${house.slug}`,
    imageKey: await mediaKey(house.coverId),
    type: 'article',
  });
}

export default async function HousePage({ params }: { params: Promise<Params> }) {
  const house = await findHouse((await params).slug);
  if (!house) notFound();

  const [gallery, blocks] = await Promise.all([
    db
      .select({ media })
      .from(houseMedia)
      .innerJoin(media, eq(houseMedia.mediaId, media.id))
      .where(eq(houseMedia.houseId, house.id))
      .orderBy(asc(houseMedia.sort)),
    Promise.resolve(parseBlocks(house.body)),
  ]);

  const [data, settings] = await Promise.all([loadBlockData(blocks), loadSettings()]);
  for (const row of gallery) data.media.set(row.media.id, row.media);

  /* Обложка — то, что выбрано в админке; галерея лишь запасной вариант,
     иначе у домика, заведённого руками, шапка оставалась пустой. */
  if (house.coverId && !data.media.has(house.coverId)) {
    const rows = await db.select().from(media).where(eq(media.id, house.coverId)).limit(1);
    if (rows[0]) data.media.set(rows[0].id, rows[0]);
  }
  const cover = (house.coverId ? data.media.get(house.coverId) : undefined) ?? gallery[0]?.media;

  return (
    <>
      <HouseLd
        house={house}
        imageUrl={cover ? mediaUrl(cover.key) : undefined}
        amenities={parseMeta(house.meta)}
      />
      <BreadcrumbsLd
        items={[
          { name: 'Главная', path: '/' },
          { name: 'Полуостров Рыбачий', path: '/rybachiy' },
          { name: house.title, path: `/rybachiy/doma/${house.slug}` },
        ]}
      />
      <Section>
        <div className="pt-24">
          <Eyebrow>Домики: {settings.legalName}</Eyebrow>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-[16ch] text-[clamp(30px,4.4vw,52px)] leading-[1.1] font-bold tracking-[-0.025em]">
              {house.title}
            </h1>
            <Btn href="/#request">{settings.ctaLabel}</Btn>
          </div>
          <p className="text-ink-2 mt-4 max-w-[56ch] text-[18px]">{house.summary}</p>

          {cover ? (
            <Picture
              media={cover}
              priority
              sizes="100vw"
              className="mt-8 aspect-[16/9] w-full rounded-[18px] object-cover"
            />
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <b className="block text-[15.5px]">До {house.capacity} гостей</b>
              <span className="text-ink-3 text-[13.5px]">вместимость дома</span>
            </Card>
            {house.pricePerNight ? (
              <Card className="p-5">
                <b className="text-ice block text-[15.5px]">
                  {house.pricePerNight.toLocaleString('ru-RU')} ₽
                </b>
                <span className="text-ink-3 text-[13.5px]">с человека в сутки</span>
              </Card>
            ) : null}
            {/* Характеристики, которые владелец добавляет сам в админке */}
            {parseMeta(house.meta).map((item, i) => (
              <Card key={i} className="p-5">
                <b className="block text-[15.5px]">{item.value}</b>
                <span className="text-ink-3 text-[13.5px]">{item.label}</span>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      <BlockList blocks={blocks} data={data} />

      <Section alt>
        <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Свободны нужные даты?</h2>
            <p className="text-ink-2 mt-2">Оставьте заявку — проверим и перезвоним.</p>
            <div className="mt-5 flex justify-center">
              <Btn href="/#request">{settings.ctaLabel}</Btn>
          </div>
        </div>
      </Section>
    </>
  );
}
