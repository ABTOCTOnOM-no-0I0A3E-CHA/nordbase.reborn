import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { media, seasons } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { loadBlockData } from '@/lib/site-data';
import { BlockList } from '@/components/blocks/render';
import { Picture } from '@/components/blocks/Picture';
import { Btn, Eyebrow, Section } from '@/components/site/ui';

type Params = { season: string };

async function findSeason(slug: string) {
  const rows = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.slug, slug), eq(seasons.status, 'published')))
    .limit(1);
  return rows[0];
}

/* Рендерим на каждый запрос: контент правится в админке, и страница обязана
   показывать текущее состояние, а не снимок на момент сборки. Нагрузка тут
   в единицы запросов в минуту, кешировать нечего. */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const season = await findSeason((await params).season);
  if (!season) return {};
  return { title: `Териберка — ${season.title.toLowerCase()}` };
}

export default async function SeasonPage({ params }: { params: Promise<Params> }) {
  const season = await findSeason((await params).season);
  if (!season) notFound();

  const blocks = parseBlocks(season.body);
  const data = await loadBlockData(blocks);

  /* Обложку сезона loadBlockData сам не подтянет — она не упомянута в блоках. */
  if (season.coverId && !data.media.has(season.coverId)) {
    const rows = await db.select().from(media).where(eq(media.id, season.coverId)).limit(1);
    if (rows[0]) data.media.set(rows[0].id, rows[0]);
  }

  return (
    <>
      <Section>
        <div className="pt-24">
          <Eyebrow>Териберка</Eyebrow>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="text-[clamp(30px,4.4vw,52px)] leading-[1.1] font-bold tracking-[-0.025em]">
              {season.title}
            </h1>
            <Btn href="/#request">Оставить заявку</Btn>
          </div>
          {season.coverId ? (
            <Picture
              media={data.media.get(season.coverId)}
              priority
              sizes="100vw"
              className="mt-8 aspect-[16/9] w-full rounded-[18px] object-cover"
            />
          ) : null}
        </div>
      </Section>

      <BlockList blocks={blocks} data={data} />
    </>
  );
}
