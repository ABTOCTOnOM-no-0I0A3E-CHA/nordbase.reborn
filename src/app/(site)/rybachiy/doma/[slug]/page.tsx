import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { houseMedia, houses, media } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { loadBlockData } from '@/lib/site-data';
import { BlockList } from '@/components/blocks/render';
import { Picture } from '@/components/blocks/Picture';
import { Btn, Card, Eyebrow, Section, Wrap } from '@/components/site/ui';

type Params = { slug: string };

async function findHouse(slug: string) {
  const rows = await db
    .select()
    .from(houses)
    .where(and(eq(houses.slug, slug), eq(houses.status, 'published')))
    .limit(1);
  return rows[0];
}

export async function generateStaticParams() {
  const rows = await db
    .select({ slug: houses.slug })
    .from(houses)
    .where(eq(houses.status, 'published'));
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const house = await findHouse((await params).slug);
  if (!house) return {};
  return { title: house.title, description: house.summary };
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

  const cover = gallery[0]?.media;
  const data = await loadBlockData(blocks);
  for (const row of gallery) data.media.set(row.media.id, row.media);

  return (
    <>
      <Section>
        <div className="pt-24">
          <Eyebrow>Домики базы «Север»</Eyebrow>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-[16ch] text-[clamp(30px,4.4vw,52px)] leading-[1.1] font-bold tracking-[-0.025em]">
              {house.title}
            </h1>
            <Btn href="/#request">Забронировать</Btn>
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
            {house.meta.map((item, i) => (
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
        <Wrap>
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Свободны нужные даты?</h2>
            <p className="text-ink-2 mt-2">Оставьте заявку — проверим и перезвоним.</p>
            <div className="mt-5 flex justify-center">
              <Btn href="/#request">Оставить заявку</Btn>
            </div>
          </div>
        </Wrap>
      </Section>
    </>
  );
}
