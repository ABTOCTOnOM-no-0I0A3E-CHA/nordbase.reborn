import Link from 'next/link';
import type { Block } from '@/lib/blocks';
import { loadRequestFormOptions, type BlockData } from '@/lib/site-data';
import { loadBusyDates } from '@/lib/occupancy';
import { AvailabilityCalendar } from '@/components/site/AvailabilityCalendar';
import { todayIso } from '@/lib/dates';
import { loadSettings } from '@/lib/site-data';
import { Aurora } from '@/components/site/Aurora';
import { Btn, Card, Eyebrow, Prose, Section, SectionHead, Wrap } from '@/components/site/ui';
import { Picture } from './Picture';
import { safeHref } from '@/lib/safe-href';
import { RequestForm } from '@/components/site/RequestForm';
import { Faq } from '@/components/site/Faq';
import { FaqLd } from '@/components/site/Schema';
import { MapWidget } from '@/components/site/MapWidget';

const money = (value: number | null) =>
  value === null ? null : `${value.toLocaleString('ru-RU')} ₽`;

const accentClass = {
  aurora: 'bg-aurora',
  ice: 'bg-ice',
  violet: 'bg-violet',
  amber: 'bg-amber',
} as const;

/* ------------------------------------------------------------- обложка */

function Hero({ block, data }: { block: Extract<Block, { type: 'hero' }>; data: BlockData }) {
  const cover = block.mediaId ? data.media.get(block.mediaId) : undefined;

  return (
    <section
      className={`relative flex items-end overflow-hidden ${
        /* svh, а не vh: на телефоне адресная строка то появляется, то прячется,
           и обложка на 100vh прыгала бы при каждом скролле. */
        block.height === 'compact' ? 'min-h-[min(56svh,480px)]' : 'min-h-svh'
      }`}
    >
      <div className="absolute inset-0 z-0">
        {cover ? (
          <Picture
            media={cover}
            fill
            priority
            sizes="100vw"
            className="scale-[1.06] object-cover brightness-[0.6] contrast-[1.12] saturate-[0.18]"
          />
        ) : (
          <div className="bg-bg-2 absolute inset-0" />
        )}
        <div className="from-bg/70 via-bg/30 to-bg/95 absolute inset-0 z-[2] bg-gradient-to-b" />
      </div>

      {block.aurora ? <Aurora /> : null}
      <div className="grain" />
      {/* вуаль под шапкой: сияние уходит в глубину, навигация остаётся читаемой */}
      <div className="from-bg/90 pointer-events-none absolute inset-x-0 top-0 z-[3] h-[190px] bg-gradient-to-b to-transparent" />

      {/* Отступ сверху обходит фиксированную шапку. У невысокой обложки он
          был таким же, как у полноэкранной, и съедал половину блока. */}
      <div
        className={`relative z-[4] w-full ${
          block.height === 'compact' ? 'pt-[120px] pb-8' : 'pt-[170px] pb-11'
        }`}
      >
        <Wrap>
          {block.eyebrow ? <Eyebrow>{block.eyebrow}</Eyebrow> : null}
          {block.title ? (
            <h1
              className={`max-w-[15ch] font-bold tracking-[-0.025em] text-balance ${
                block.height === 'compact'
                  ? 'mt-3 mb-4 text-[clamp(30px,4.4vw,48px)] leading-[1.1]'
                  : 'mt-5 mb-6 text-[clamp(34px,5.2vw,62px)] leading-[1.1]'
              }`}
            >
              {block.title}
            </h1>
          ) : null}
          {block.lead ? (
            <p
              className={`text-ink-hero max-w-[56ch] text-[18px] ${
                block.height === 'compact' ? 'mb-5' : 'mb-8'
              }`}
            >
              {block.lead}
            </p>
          ) : null}

          {block.primaryLabel || block.secondaryLabel ? (
            <div className={`flex flex-wrap gap-3 ${block.height === 'compact' ? 'mb-0' : 'mb-11'}`}>
              {block.primaryLabel ? (
                <Btn href={safeHref(block.primaryHref) ?? '#request'}>{block.primaryLabel}</Btn>
              ) : null}
              {block.secondaryLabel ? (
                <Btn href={safeHref(block.secondaryHref) ?? '#'} variant="outline">
                  {block.secondaryLabel}
                </Btn>
              ) : null}
            </div>
          ) : null}

          {block.cards.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
              {block.cards.filter((card) => card.title || card.text).map((card, i) => {
                const inner = (
                  <>
                    <b className="mb-2 flex items-center gap-2.5 text-[16px] font-semibold">
                      <span
                        className={`h-2 w-2 flex-none rounded-full ${accentClass[card.accent]}`}
                      />
                      {card.title}
                    </b>
                    <p className="text-ink-2 text-[13.5px] leading-[1.5]">{card.text}</p>
                  </>
                );
                const cls =
                  'bg-bg-2/70 border-line hover:border-line-2 block rounded-[14px] border px-5 py-4 backdrop-blur-[10px] transition hover:-translate-y-[3px]';
                const href = safeHref(card.href);
                return href ? (
                  <Link key={i} href={href} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <div key={i} className={cls}>
                    {inner}
                  </div>
                );
              })}
            </div>
          ) : null}
        </Wrap>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- статические */

function TextBlock({ block }: { block: Extract<Block, { type: 'text' }> }) {
  return (
    <>
      <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <Prose text={block.body} className="max-w-[68ch]" />
    </>
  );
}

function TextMedia({
  block,
  data,
}: {
  block: Extract<Block, { type: 'textMedia' }>;
  data: BlockData;
}) {
  const image = block.mediaId ? data.media.get(block.mediaId) : undefined;
  const mediaFirst = block.side === 'left';

  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
      <div className={mediaFirst ? 'md:order-2' : ''}>
        {block.eyebrow ? <Eyebrow>{block.eyebrow}</Eyebrow> : null}
        {block.title ? (
          <h2 className="mt-4 mb-5 text-[clamp(26px,3.4vw,40px)] leading-[1.1] font-bold tracking-[-0.025em] text-balance">
            {block.title}
          </h2>
        ) : null}
        <Prose text={block.body} />
      </div>
      <div className={`relative ${mediaFirst ? 'md:order-1' : ''}`}>
        <Picture
          media={image}
          sizes="(max-width: 768px) 100vw, 50vw"
          ratio="aspect-[4/3.1]"
          className="aspect-[4/3.1] w-full rounded-[16px] object-cover"
        />
        {block.badgeValue ? (
          <div className="bg-bg-3 border-line absolute -bottom-4 left-2 max-w-[230px] rounded-[14px] border px-5 py-4 md:-left-4">
            <b className="text-aurora block text-[26px] leading-[1.1] font-bold">
              {block.badgeValue}
            </b>
            <span className="text-ink-2 text-[13.5px]">{block.badgeLabel}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Cards({ block }: { block: Extract<Block, { type: 'cards' }> }) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[
    block.columns
  ];
  return (
    <>
      <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <div className={`grid gap-4 ${cols}`}>
        {block.items.filter((item) => item.title || item.text).map((item, i) => {
          const inner = (
            <>
              <b className="mb-2 block text-[16px] font-semibold">{item.title}</b>
              <p className="text-ink-2 text-[14px]">{item.text}</p>
            </>
          );
          const href = safeHref(item.href);
          return href ? (
            <Link
              key={i}
              href={href}
              className="bg-bg-3 border-line hover:border-line-2 rounded-[14px] border p-5 transition"
            >
              {inner}
            </Link>
          ) : (
            <Card key={i} className="p-5">
              {inner}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Facts({ block }: { block: Extract<Block, { type: 'facts' }> }) {
  return (
    <>
      <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <div className="border-line grid gap-px border-t sm:grid-cols-2 lg:grid-cols-4">
        {block.items.filter((item) => item.value || item.label).map((item, i) => (
          <div key={i} className="border-line py-5 pr-6 sm:border-r last:sm:border-r-0">
            <b className="block text-[20px] font-semibold">{item.value}</b>
            <span className="text-ink-3 text-[13.5px]">{item.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Gallery({ block, data }: { block: Extract<Block, { type: 'gallery' }>; data: BlockData }) {
  return (
    <>
      <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {block.mediaIds.map((id) => (
          <Picture
            key={id}
            media={data.media.get(id)}
            sizes="(max-width: 640px) 50vw, 33vw"
            className="aspect-[4/3] w-full rounded-[14px] object-cover"
          />
        ))}
      </div>
    </>
  );
}

function Cta({ block }: { block: Extract<Block, { type: 'cta' }> }) {
  return (
    <Card className="flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
      <div>
        {block.title ? <h2 className="text-2xl font-bold tracking-tight">{block.title}</h2> : null}
        {block.subtitle ? <p className="text-ink-2 mt-2 max-w-[52ch]">{block.subtitle}</p> : null}
      </div>
      {block.label ? <Btn href={safeHref(block.href) ?? '#request'}>{block.label}</Btn> : null}
    </Card>
  );
}

/* ------------------------------------------------------------- связанные */

function Houses({ block, data }: { block: Extract<Block, { type: 'houses' }>; data: BlockData }) {
  const items = block.limit > 0 ? data.houses.slice(0, block.limit) : data.houses;
  return (
    <>
      <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((house) => (
          <Link
            key={house.id}
            href={`/rybachiy/doma/${house.slug}`}
            className="bg-bg-3 border-line hover:border-line-2 overflow-hidden rounded-[16px] border transition"
          >
            <Picture
              media={house.coverId ? data.media.get(house.coverId) : undefined}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-[19px] font-bold tracking-[-0.015em]">{house.title}</h3>
                <span className="bg-ok/15 text-ok rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase">
                  до {house.capacity}
                </span>
              </div>
              <p className="text-ink-2 text-[14.5px]">{house.summary}</p>
              {house.pricePerNight ? (
                <p className="text-aurora mt-3 text-[14px] font-semibold">
                  {money(house.pricePerNight)} / чел. в сутки
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function Tours({ block, data }: { block: Extract<Block, { type: 'tours' }>; data: BlockData }) {
  const items = block.limit > 0 ? data.tours.slice(0, block.limit) : data.tours;
  return (
    <>
      <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((tour) => (
          <Link
            key={tour.id}
            href={`/rybachiy/tury/${tour.slug}`}
            className="bg-bg-3 border-line hover:border-line-2 flex flex-col rounded-[18px] border p-7 transition"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-[23px] font-bold tracking-[-0.015em]">{tour.title}</h3>
              <span className="font-display text-ice text-[12px] tracking-[0.1em] whitespace-nowrap">
                {tour.days} ДНЯ
              </span>
            </div>
            <p className="text-ink-2 mt-3 flex-1 text-[14.5px]">{tour.summary}</p>
            {tour.price ? (
              <p className="text-aurora mt-4 text-[14px] font-semibold">от {money(tour.price)}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </>
  );
}

function Seasons({ block, data }: { block: Extract<Block, { type: 'seasons' }>; data: BlockData }) {
  const accent: Record<string, string> = {
    aurora: 'bg-aurora',
    ice: 'bg-ice',
    violet: 'bg-violet',
    amber: 'bg-amber',
  };
  return (
    <>
      <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {data.seasons.map((season) => (
          <Link
            key={season.id}
            href={`/teriberka/${season.slug}`}
            className="bg-bg-3 border-line hover:border-line-2 relative flex flex-col overflow-hidden rounded-[16px] border transition hover:-translate-y-1"
          >
            <span
              className={`absolute inset-x-0 top-0 z-[2] h-[3px] ${accent[season.accent] ?? 'bg-ice'}`}
            />
            <div className="relative">
              <Picture
                media={season.coverId ? data.media.get(season.coverId) : undefined}
                sizes="(max-width: 640px) 100vw, 25vw"
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="from-bg-3/85 absolute inset-0 bg-gradient-to-t to-transparent" />
              <b className="font-display absolute bottom-3 left-4 z-[2] text-[15px] font-semibold">
                {season.title}
              </b>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function Prices({ block, data }: { block: Extract<Block, { type: 'prices' }>; data: BlockData }) {
  const rows = block.group ? data.prices.filter((p) => p.group === block.group) : data.prices;
  return (
    <>
      <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <div className="max-w-[820px]">
        {rows.map((row) => (
          <div
            key={row.id}
            className="border-line flex flex-wrap items-baseline gap-3 border-b py-4 last:border-b-0"
          >
            <b className="text-[16.5px] font-semibold whitespace-nowrap">{row.title}</b>
            {row.note ? (
              <span className="text-ink-3 order-3 basis-full text-[13.5px] sm:order-none sm:basis-auto">
                {row.note}
              </span>
            ) : null}
            <span className="border-line-2 hidden min-w-4 flex-1 -translate-y-1 border-b border-dotted sm:block" />
            {/* Без суммы правую колонку заполняет «Единица»: туда владелец
                пишет «включено» или «по запросу». Пусто — ставим «по запросу». */}
            <span className="text-ice ml-auto font-semibold whitespace-nowrap">
              {row.amount === null ? (
                <span className="text-ink-2">{row.unit || 'по запросу'}</span>
              ) : (
                <>
                  {money(row.amount)}
                  {row.unit ? <span className="text-ink-3 font-normal"> {row.unit}</span> : null}
                </>
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

async function Reviews({ block, data }: { block: Extract<Block, { type: 'reviews' }>; data: BlockData }) {
  const settings = await loadSettings();
  const external = safeHref(settings.reviewsUrl);

  /* Пока своих отзывов нет, но есть карточка на Яндекс.Картах — показываем
     только ссылку. Пустая секция без единого отзыва на сайте не нужна. */
  if (data.reviews.length === 0) {
    if (!external) return null;
    return (
      <>
        <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
        <Btn href={external}>{settings.reviewsLabel}</Btn>
      </>
    );
  }

  return (
    <>
      <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <div className="grid gap-5 md:grid-cols-3">
        {data.reviews.map((review) => (
          <Card key={review.id} className="flex flex-col gap-4 p-6">
            <p className="text-ink-2 flex-1 text-[14.5px]">{review.text}</p>
            <div>
              <b className="block text-[15px] font-semibold">{review.author}</b>
              {review.source ? (
                <span className="text-ink-3 text-[13px]">{review.source}</span>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      {external ? (
        <div className="mt-7">
          <Btn href={external} variant="outline">
            {settings.reviewsLabel}
          </Btn>
        </div>
      ) : null}
    </>
  );
}

/* Блок формы всегда показывает домики и туры, даже если на этой странице нет
   блоков «Домики» и «Туры» — иначе в выпадающих списках было бы пусто. */
async function RequestFormSection({
  block,
  data,
}: {
  block: Extract<Block, { type: 'requestForm' }>;
  data: BlockData;
}) {
  const [{ houses, tours }, busyByHouse, settings] = await Promise.all([
    loadRequestFormOptions(data),
    loadBusyDates(),
    loadSettings(),
  ]);

  return (
    <>
      <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <RequestForm
        houses={houses}
        tours={tours}
        busyByHouse={busyByHouse}
        today={todayIso()}
        directions={settings.directions}
        submitLabel={settings.ctaLabel}
        telegram={settings.telegram}
        whatsapp={settings.whatsapp}
      />
    </>
  );
}

/* Календарю нужны занятые даты и число домиков: день считается закрытым,
   только когда заняты все — если хоть один свободен, гостю есть куда заехать. */
async function AvailabilitySection({
  block,
  data,
}: {
  block: Extract<Block, { type: 'availability' }>;
  data: BlockData;
}) {
  const [{ houses }, busyByHouse] = await Promise.all([
    loadRequestFormOptions(data),
    loadBusyDates(),
  ]);

  return (
    <>
      <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
      <AvailabilityCalendar
        busyByHouse={busyByHouse}
        houseCount={houses.length}
        today={todayIso()}
        months={block.months}
      />
    </>
  );
}

/* ------------------------------------------------------------- диспетчер */

/* Hero сам себе секция — на всю ширину, без отступов и подложки. */
const FULL_BLEED = new Set<Block['type']>(['hero']);

function Body({ block, data }: { block: Block; data: BlockData }) {
  switch (block.type) {
    case 'hero':
      return <Hero block={block} data={data} />;
    case 'text':
      return <TextBlock block={block} />;
    case 'textMedia':
      return <TextMedia block={block} data={data} />;
    case 'cards':
      return <Cards block={block} />;
    case 'facts':
      return <Facts block={block} />;
    case 'gallery':
      return <Gallery block={block} data={data} />;
    case 'cta':
      return <Cta block={block} />;
    case 'map':
      return (
        <>
          <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
          <MapWidget lat={block.lat} lng={block.lng} zoom={block.zoom} orgId={block.orgId} />
        </>
      );
    case 'houses':
      return <Houses block={block} data={data} />;
    case 'tours':
      return <Tours block={block} data={data} />;
    case 'seasons':
      return <Seasons block={block} data={data} />;
    case 'prices':
      return <Prices block={block} data={data} />;
    case 'faq':
      return (
        <>
          <SectionHead eyebrow={block.eyebrow} title={block.title} subtitle={block.subtitle} />
          {/* Те же вопросы уходят в разметку: Яндекс разворачивает их прямо
              под сниппетом, и страница занимает вдвое больше места в выдаче. */}
          <FaqLd items={data.faq.map((item) => ({ question: item.question, answer: item.answer }))} />
          <Faq items={data.faq} />
        </>
      );
    case 'reviews':
      return <Reviews block={block} data={data} />;
    case 'requestForm':
      return <RequestFormSection block={block} data={data} />;
    case 'availability':
      return <AvailabilitySection block={block} data={data} />;
  }
}

export function BlockList({ blocks, data }: { blocks: Block[]; data: BlockData }) {
  let tinted = false;
  return (
    <>
      {blocks.map((block, index) => {
        /* Снятая галочка в блоке календаря убирает его целиком, вместе с
           полосой секции: иначе на странице остаётся пустой отступ. */
        if (block.type === 'availability' && !block.visible) return null;
        if (FULL_BLEED.has(block.type)) {
          return <Body key={index} block={block} data={data} />;
        }
        /* Секции чередуют два фона — как в утверждённом концепте. */
        tinted = !tinted;
        return (
          <Section
            key={index}
            alt={tinted}
            id={block.type === 'requestForm' ? 'request' : undefined}
          >
            <Body block={block} data={data} />
          </Section>
        );
      })}
    </>
  );
}
