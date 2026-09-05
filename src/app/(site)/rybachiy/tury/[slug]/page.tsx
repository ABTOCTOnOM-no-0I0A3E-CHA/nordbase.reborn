import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tourDays, tourStops, tours } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { loadBlockData } from '@/lib/site-data';
import { BlockList } from '@/components/blocks/render';
import { Btn, Card, Eyebrow, Section } from '@/components/site/ui';

type Params = { slug: string };

async function findTour(slug: string) {
  const rows = await db
    .select()
    .from(tours)
    .where(and(eq(tours.slug, slug), eq(tours.status, 'published')))
    .limit(1);
  return rows[0];
}

export async function generateStaticParams() {
  const rows = await db.select({ slug: tours.slug }).from(tours).where(eq(tours.status, 'published'));
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const tour = await findTour((await params).slug);
  if (!tour) return {};
  return { title: tour.title, description: tour.summary };
}

export default async function TourPage({ params }: { params: Promise<Params> }) {
  const tour = await findTour((await params).slug);
  if (!tour) notFound();

  /* Программа плоским запросом и группировка в памяти: дней максимум единицы,
     отдельный запрос на каждый день был бы N+1 на пустом месте. */
  const rows = await db
    .select({
      dayId: tourDays.id,
      dayNo: tourDays.dayNo,
      dayTitle: tourDays.title,
      stopTitle: tourStops.title,
      isFinish: tourStops.isFinish,
      sort: tourStops.sort,
    })
    .from(tourDays)
    .leftJoin(tourStops, eq(tourStops.tourDayId, tourDays.id))
    .where(eq(tourDays.tourId, tour.id))
    .orderBy(asc(tourDays.dayNo), asc(tourStops.sort));

  const days = new Map<number, { title: string; stops: { title: string; isFinish: boolean }[] }>();
  for (const row of rows) {
    const day = days.get(row.dayNo) ?? { title: row.dayTitle || `День ${row.dayNo}`, stops: [] };
    if (row.stopTitle) day.stops.push({ title: row.stopTitle, isFinish: row.isFinish ?? false });
    days.set(row.dayNo, day);
  }

  const blocks = parseBlocks(tour.body);
  const data = await loadBlockData(blocks);

  return (
    <>
      <Section>
        <div className="pt-24">
          <Eyebrow>Туры по Рыбачьему</Eyebrow>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-[16ch] text-[clamp(30px,4.4vw,52px)] leading-[1.1] font-bold tracking-[-0.025em]">
              {tour.title}
            </h1>
            <Btn href="/#request">Забронировать</Btn>
          </div>
          <p className="text-ink-2 mt-4 max-w-[60ch] text-[18px]">{tour.summary}</p>

          {tour.meta.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tour.meta.map((item, i) => (
                <Card key={i} className="p-5">
                  <b className="block text-[15.5px]">{item.value}</b>
                  <span className="text-ink-3 text-[13.5px]">{item.label}</span>
                </Card>
              ))}
            </div>
          ) : null}

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {[...days.entries()].map(([dayNo, day]) => (
              <Card key={dayNo} className="p-7">
                <div className="text-aurora mb-3 flex items-center gap-3 text-[12.5px] font-semibold tracking-[0.06em] uppercase">
                  {day.title}
                  <span className="bg-line h-px flex-1" />
                </div>
                <ul className="grid gap-2">
                  {day.stops.map((stop, i) => (
                    <li
                      key={i}
                      className={`flex gap-2.5 text-[14.5px] leading-[1.45] ${
                        stop.isFinish ? 'text-ink font-semibold' : 'text-ink-2'
                      }`}
                    >
                      <span
                        className={`mt-2 size-[5px] flex-none rounded-full ${
                          stop.isFinish ? 'bg-aurora' : 'bg-line-2'
                        }`}
                      />
                      {stop.title}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      <BlockList blocks={blocks} data={data} />
    </>
  );
}
