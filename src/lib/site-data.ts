import 'server-only';
import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  faq as faqTable,
  houses as housesTable,
  media as mediaTable,
  prices as pricesTable,
  reviews as reviewsTable,
  seasons as seasonsTable,
  settings as settingsTable,
  tours as toursTable,
} from '@/db/schema';
import { z } from 'zod';
import type { Block } from './blocks';

export type MediaRecord = typeof mediaTable.$inferSelect;
export type HouseRecord = typeof housesTable.$inferSelect;
export type TourRecord = typeof toursTable.$inferSelect;
export type SeasonRecord = typeof seasonsTable.$inferSelect;
export type PriceRecord = typeof pricesTable.$inferSelect;
export type FaqRecord = typeof faqTable.$inferSelect;
export type ReviewRecord = typeof reviewsTable.$inferSelect;

/* $type в drizzle — это утверждение, а не проверка: в колонке может оказаться
   что угодно. Пары «название → значение» правит владелец, поэтому мусор просто
   отбрасываем, а не роняем публичную страницу. */
export function parseMeta(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is { label: string; value: string } =>
      typeof row === 'object' &&
      row !== null &&
      typeof (row as { label?: unknown }).label === 'string' &&
      typeof (row as { value?: unknown }).value === 'string',
  );
}

export type BlockData = {
  media: Map<string, MediaRecord>;
  houses: HouseRecord[];
  tours: TourRecord[];
  seasons: SeasonRecord[];
  prices: PriceRecord[];
  faq: FaqRecord[];
  reviews: ReviewRecord[];
};

const empty: BlockData = {
  media: new Map(),
  houses: [],
  tours: [],
  seasons: [],
  prices: [],
  faq: [],
  reviews: [],
};

/* Грузим только те справочники, которые реально нужны блокам этой страницы,
   и все картинки одним запросом — иначе на странице с галереей будет N+1. */
export async function loadBlockData(blocks: Block[]): Promise<BlockData> {
  if (blocks.length === 0) return empty;

  const types = new Set(blocks.map((b) => b.type));
  const mediaIds = new Set<string>();

  for (const block of blocks) {
    if ('mediaId' in block && block.mediaId) mediaIds.add(block.mediaId);
    if (block.type === 'gallery') for (const id of block.mediaIds) mediaIds.add(id);
  }

  const [houses, tours, seasons, prices, faq, reviews] = await Promise.all([
    types.has('houses')
      ? db
          .select()
          .from(housesTable)
          .where(eq(housesTable.status, 'published'))
          .orderBy(asc(housesTable.sort))
      : [],
    types.has('tours')
      ? db
          .select()
          .from(toursTable)
          .where(eq(toursTable.status, 'published'))
          .orderBy(asc(toursTable.sort))
      : [],
    types.has('seasons')
      ? db
          .select()
          .from(seasonsTable)
          .where(eq(seasonsTable.status, 'published'))
          .orderBy(asc(seasonsTable.sort))
      : [],
    types.has('prices')
      ? db
          .select()
          .from(pricesTable)
          .where(eq(pricesTable.visible, true))
          .orderBy(asc(pricesTable.sort))
      : [],
    types.has('faq')
      ? db.select().from(faqTable).where(eq(faqTable.visible, true)).orderBy(asc(faqTable.sort))
      : [],
    types.has('reviews')
      ? db
          .select()
          .from(reviewsTable)
          .where(eq(reviewsTable.visible, true))
          .orderBy(asc(reviewsTable.sort))
      : [],
  ]);

  /* Обложки справочников — тоже картинки, добираем их в тот же запрос. */
  for (const row of [...houses, ...tours, ...seasons]) {
    if (row.coverId) mediaIds.add(row.coverId);
  }
  for (const row of reviews) {
    if (row.mediaId) mediaIds.add(row.mediaId);
  }

  const mediaRows =
    mediaIds.size > 0
      ? await db
          .select()
          .from(mediaTable)
          .where(inArray(mediaTable.id, [...mediaIds]))
      : [];

  return {
    media: new Map(mediaRows.map((m) => [m.id, m])),
    houses,
    tours,
    seasons,
    prices,
    faq,
    reviews,
  };
}

/* Списки для формы заявки. Если блоки «Домики» и «Туры» на странице уже есть,
   переиспользуем загруженное, иначе идём в БД — лишнего запроса не будет. */
export type StayOption = Pick<
  HouseRecord,
  'id' | 'title' | 'capacity' | 'minGuests' | 'pricePerNight' | 'kind'
>;

export async function loadRequestFormOptions(data: BlockData): Promise<{
  houses: StayOption[];
  tours: { id: string; title: string }[];
}> {
  const [houseRows, tourRows] = await Promise.all([
    data.houses.length > 0
      ? data.houses
      : db
          .select({
            id: housesTable.id,
            title: housesTable.title,
            capacity: housesTable.capacity,
            minGuests: housesTable.minGuests,
            pricePerNight: housesTable.pricePerNight,
            kind: housesTable.kind,
          })
          .from(housesTable)
          .where(eq(housesTable.status, 'published'))
          .orderBy(asc(housesTable.sort)),
    data.tours.length > 0
      ? data.tours
      : db
          .select({ id: toursTable.id, title: toursTable.title })
          .from(toursTable)
          .where(eq(toursTable.status, 'published'))
          .orderBy(asc(toursTable.sort)),
  ]);

  return {
    houses: houseRows.map((h) => ({
      id: h.id,
      title: h.title,
      capacity: h.capacity,
      minGuests: h.minGuests,
      pricePerNight: h.pricePerNight,
      kind: h.kind,
    })),
    tours: tourRows.map((t) => ({ id: t.id, title: t.title })),
  };
}

/* ------------------------------------------------------------ настройки */

export type SiteSettings = {
  /* Название в шапке. Отдельно от юридического — в шапке оно набрано латиницей. */
  brandName: string;
  /* Как база называется в текстах, подвале и разметке для поисковиков. */
  legalName: string;
  /* Заголовок и описание для страниц, у которых нет своих. */
  seoTitle: string;
  seoDescription: string;
  /* Надпись на кнопке заявки — одна на весь сайт. */
  ctaLabel: string;
  phone: string;
  telegram: string;
  whatsapp: string;
  vk: string;
  /* Ссылка на отзывы во внешнем сервисе (Яндекс.Карты) и подпись к ней. */
  reviewsUrl: string;
  reviewsLabel: string;
  address: string;
  lat: number;
  lng: number;
  menu: { label: string; href: string }[];
  /* Варианты в поле «Куда едете» формы заявки. */
  directions: string[];
  /* Коды подтверждения прав в панелях вебмастера. Владелец вставляет их сам:
     в коде им не место — сайт один, а панели заводятся под его аккаунты. */
  yandexVerification: string;
  googleVerification: string;
  /* Картинка, которую видят в мессенджерах и соцсетях, когда у страницы нет
     своей. Id файла в медиатеке, как и у всех остальных обложек. */
  ogMediaId: string;
  /* Номер счётчика Яндекс.Метрики. Пусто — счётчик не подключается вовсе,
     и на сайт не уезжает ни одного стороннего скрипта. */
  metrikaId: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brandName: 'NORDBASE',
  legalName: 'База отдыха «Север»',
  seoTitle: 'База отдыха «Север» — Рыбачий и Териберка',
  seoDescription:
    'Своя база на полуострове Рыбачий и авторские туры по Териберке. Заброска на вездеходе входит в стоимость тура, пропуск в погранзону оформляем сами.',
  ctaLabel: 'Оставить заявку',
  reviewsUrl: '',
  reviewsLabel: 'Смотреть отзывы на Яндекс.Картах',
  directions: ['Полуостров Рыбачий', 'Териберка', 'Ещё не решили'],
  phone: '+7 911 802-86-14',
  telegram: 'https://t.me/+79118028614',
  whatsapp: 'https://wa.me/79118028614',
  vk: 'https://vk.com/bazasever51',
  address: 'Полуостров Рыбачий, Мурманская область',
  lat: 69.785748,
  lng: 32.102471,
  yandexVerification: '',
  googleVerification: '',
  ogMediaId: '',
  metrikaId: '',
  menu: [
    { label: 'Рыбачий', href: '/rybachiy' },
    { label: 'Туры', href: '/rybachiy/tury' },
    { label: 'Териберка', href: '/teriberka' },
    { label: 'Транспорт', href: '/transport' },
    { label: 'Цены', href: '/ceny' },
    { label: 'Контакты', href: '/contacts' },
  ],
};

/* Настройки читает layout, то есть каждая страница сайта. Спред без проверки
   означал, что menu: null из ручной правки БД уронит вообще всё, включая
   главную. Поэтому разбираем схемой и на любой мусор берём значение по умолчанию. */
const settingsSchema = z.object({
  brandName: z.string().catch(DEFAULT_SETTINGS.brandName),
  legalName: z.string().catch(DEFAULT_SETTINGS.legalName),
  seoTitle: z.string().catch(DEFAULT_SETTINGS.seoTitle),
  seoDescription: z.string().catch(DEFAULT_SETTINGS.seoDescription),
  ctaLabel: z.string().catch(DEFAULT_SETTINGS.ctaLabel),
  reviewsUrl: z.string().catch(DEFAULT_SETTINGS.reviewsUrl),
  reviewsLabel: z.string().catch(DEFAULT_SETTINGS.reviewsLabel),
  directions: z.array(z.string()).catch(DEFAULT_SETTINGS.directions),
  yandexVerification: z.string().catch(DEFAULT_SETTINGS.yandexVerification),
  googleVerification: z.string().catch(DEFAULT_SETTINGS.googleVerification),
  ogMediaId: z.string().catch(DEFAULT_SETTINGS.ogMediaId),
  metrikaId: z.string().catch(DEFAULT_SETTINGS.metrikaId),
  phone: z.string().catch(DEFAULT_SETTINGS.phone),
  telegram: z.string().catch(DEFAULT_SETTINGS.telegram),
  whatsapp: z.string().catch(DEFAULT_SETTINGS.whatsapp),
  vk: z.string().catch(DEFAULT_SETTINGS.vk),
  address: z.string().catch(DEFAULT_SETTINGS.address),
  lat: z.number().catch(DEFAULT_SETTINGS.lat),
  lng: z.number().catch(DEFAULT_SETTINGS.lng),
  menu: z
    .array(z.object({ label: z.string(), href: z.string() }))
    .catch(DEFAULT_SETTINGS.menu),
});

export async function loadSettings(): Promise<SiteSettings> {
  let rows;
  try {
    rows = await db.select().from(settingsTable).where(eq(settingsTable.key, 'site')).limit(1);
  } catch (cause) {
    /* Настройки читает корневой layout, а его метаданные Next собирает и для
       статических страниц вроде «не найдено» — во время сборки базы ещё нет.
       Значения по умолчанию тут честнее, чем упавшая сборка: заголовок и
       описание у нас и так имеют осмысленный запасной вариант. */
    console.warn('Настройки недоступны, беру значения по умолчанию:', cause);
    return DEFAULT_SETTINGS;
  }

  const stored = rows[0]?.value;
  if (!stored || typeof stored !== 'object') return DEFAULT_SETTINGS;

  const parsed = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...stored });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}
