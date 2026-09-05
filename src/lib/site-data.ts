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
import type { Block } from './blocks';

export type MediaRecord = typeof mediaTable.$inferSelect;
export type HouseRecord = typeof housesTable.$inferSelect;
export type TourRecord = typeof toursTable.$inferSelect;
export type SeasonRecord = typeof seasonsTable.$inferSelect;
export type PriceRecord = typeof pricesTable.$inferSelect;
export type FaqRecord = typeof faqTable.$inferSelect;
export type ReviewRecord = typeof reviewsTable.$inferSelect;

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
export async function loadRequestFormOptions(data: BlockData): Promise<{
  houses: { id: string; title: string }[];
  tours: { id: string; title: string }[];
}> {
  const [houseRows, tourRows] = await Promise.all([
    data.houses.length > 0
      ? data.houses
      : db
          .select({ id: housesTable.id, title: housesTable.title })
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
    houses: houseRows.map((h) => ({ id: h.id, title: h.title })),
    tours: tourRows.map((t) => ({ id: t.id, title: t.title })),
  };
}

/* ------------------------------------------------------------ настройки */

export type SiteSettings = {
  phone: string;
  telegram: string;
  whatsapp: string;
  vk: string;
  address: string;
  lat: number;
  lng: number;
  menu: { label: string; href: string }[];
};

export const DEFAULT_SETTINGS: SiteSettings = {
  phone: '+7 911 802-86-14',
  telegram: 'https://t.me/+79118028614',
  whatsapp: 'https://wa.me/79118028614',
  vk: 'https://vk.com/bazasever51',
  address: 'Полуостров Рыбачий, Мурманская область',
  lat: 69.785748,
  lng: 32.102471,
  menu: [
    { label: 'Рыбачий', href: '/rybachiy' },
    { label: 'Туры', href: '/rybachiy/tury' },
    { label: 'Териберка', href: '/teriberka' },
    { label: 'Транспорт', href: '/transport' },
    { label: 'Цены', href: '/ceny' },
    { label: 'Контакты', href: '/contacts' },
  ],
};

export async function loadSettings(): Promise<SiteSettings> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, 'site')).limit(1);
  const stored = rows[0]?.value;
  if (!stored || typeof stored !== 'object') return DEFAULT_SETTINGS;
  /* Настройки правит владелец, поэтому неизвестные или битые поля просто
     перекрываются дефолтами, а не роняют весь сайт. */
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<SiteSettings>) };
}
