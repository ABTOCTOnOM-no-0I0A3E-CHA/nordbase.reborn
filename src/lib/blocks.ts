import { z } from 'zod';
import { sanitizeRichText } from './rich-text';

/* Набор блоков фиксирован намеренно: клиент собирает из них что угодно,
   но не может изобрести новый тип и сломать вёрстку. Добавление типа —
   правка здесь + компонент в components/blocks: работа на пару часов.

   Блоки делятся на два вида:
   - статические — весь контент лежит в самом блоке (text, cards, gallery…);
   - связанные — тянут данные из справочников (houses, tours, prices, faq…).
     Клиент добавил домик — блок обновился сам, трогать страницу не нужно. */

const optionalText = z.string().trim().default('');
/* Поля с форматированием чистим прямо в схеме — то есть на любом пути,
   каким бы блок ни попал в базу. */
const richText = z.string().transform(sanitizeRichText).default('');
const mediaId = z.uuid().nullable().default(null);

const heading = {
  eyebrow: optionalText,
  title: optionalText,
  subtitle: optionalText,
};

export const heroBlock = z.object({
  type: z.literal('hero'),
  ...heading,
  lead: optionalText,
  mediaId,
  /* анимированное северное сияние поверх фото */
  aurora: z.boolean().default(true),
  /* full — на весь экран, compact — примерно две трети: подходит для
     внутренних страниц, где сразу под обложкой начинается содержимое. */
  height: z.enum(['full', 'compact']).default('full'),
  primaryLabel: optionalText,
  primaryHref: optionalText,
  secondaryLabel: optionalText,
  secondaryHref: optionalText,
  cards: z
    .array(
      z.object({
        title: optionalText,
        text: optionalText,
        href: optionalText,
        accent: z.enum(['aurora', 'ice', 'violet', 'amber']).default('aurora'),
      }),
    )
    .default([]),
});

export const textBlock = z.object({
  type: z.literal('text'),
  ...heading,
  body: richText,
});

export const textMediaBlock = z.object({
  type: z.literal('textMedia'),
  ...heading,
  body: richText,
  mediaId,
  side: z.enum(['left', 'right']).default('right'),
  badgeValue: optionalText,
  badgeLabel: optionalText,
});

export const cardsBlock = z.object({
  type: z.literal('cards'),
  ...heading,
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  items: z
    .array(
      z.object({
        title: optionalText,
        text: optionalText,
        href: optionalText,
      }),
    )
    .default([]),
});

export const factsBlock = z.object({
  type: z.literal('facts'),
  ...heading,
  items: z.array(z.object({ value: optionalText, label: optionalText })).default([]),
});

export const galleryBlock = z.object({
  type: z.literal('gallery'),
  ...heading,
  mediaIds: z.array(z.uuid()).default([]),
});

export const ctaBlock = z.object({
  type: z.literal('cta'),
  ...heading,
  label: optionalText,
  href: optionalText,
});

export const mapBlock = z.object({
  type: z.literal('map'),
  ...heading,
  /* Если указан id организации в Яндексе, виджет показывает карточку базы
     с фото и отзывами. Пусто — обычная метка по координатам. */
  orgId: optionalText,
  lat: z.number().catch(69.785748).default(69.785748),
  lng: z.number().catch(32.102471).default(32.102471),
  zoom: z.number().int().min(1).max(19).catch(10).default(10),
});

/* --- связанные со справочниками --- */

export const housesBlock = z.object({
  type: z.literal('houses'),
  ...heading,
  limit: z.number().int().min(0).catch(0).default(0) /* 0 — показывать все */,
});

export const toursBlock = z.object({
  type: z.literal('tours'),
  ...heading,
  limit: z.number().int().min(0).catch(0).default(0),
});

export const seasonsBlock = z.object({
  type: z.literal('seasons'),
  ...heading,
});

export const pricesBlock = z.object({
  type: z.literal('prices'),
  ...heading,
  group: optionalText /* пусто — все группы */,
});

export const faqBlock = z.object({
  type: z.literal('faq'),
  ...heading,
});

export const reviewsBlock = z.object({
  type: z.literal('reviews'),
  ...heading,
});

export const requestFormBlock = z.object({
  type: z.literal('requestForm'),
  ...heading,
});

/* Календарь занятости для гостя. Даты берутся из тех же броней, что и в
   панели, — отдельного источника нет и быть не должно.

   Выключатель нужен по-настоящему: в мёртвый сезон или пока владелец не
   привык отмечать брони, пустой календарь «всё свободно» врёт гостю сильнее,
   чем его отсутствие. Снятая галочка прячет блок со страницы, но сохраняет
   заголовки — их не приходится набирать заново. */
export const availabilityBlock = z.object({
  type: z.literal('availability'),
  ...heading,
  visible: z.boolean().catch(true).default(true),
  /* Сколько месяцев вперёд показывать. */
  months: z.coerce.number().int().min(1).max(6).catch(2).default(2),
});

export const blockSchema = z.discriminatedUnion('type', [
  heroBlock,
  textBlock,
  textMediaBlock,
  cardsBlock,
  factsBlock,
  galleryBlock,
  ctaBlock,
  mapBlock,
  housesBlock,
  toursBlock,
  seasonsBlock,
  pricesBlock,
  faqBlock,
  reviewsBlock,
  requestFormBlock,
  availabilityBlock,
]);

export const blocksSchema = z.array(blockSchema);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block['type'];

/* Что видит клиент в списке «Добавить блок». Порядок — от частого к редкому. */
export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Обложка',
  text: 'Текст',
  textMedia: 'Текст с фото',
  cards: 'Карточки',
  facts: 'Цифры',
  gallery: 'Галерея',
  houses: 'Домики',
  tours: 'Туры',
  seasons: 'Сезоны Териберки',
  prices: 'Цены',
  faq: 'Вопросы и ответы',
  reviews: 'Отзывы',
  requestForm: 'Форма заявки',
  availability: 'Календарь занятости',
  cta: 'Призыв к действию',
  map: 'Карта',
};

export const BLOCK_ORDER: BlockType[] = [
  'hero',
  'text',
  'textMedia',
  'cards',
  'facts',
  'gallery',
  'houses',
  'tours',
  'seasons',
  'prices',
  'faq',
  'reviews',
  'requestForm',
  'availability',
  'cta',
  'map',
];

/* Значения по умолчанию для только что добавленного блока. */
export function emptyBlock(type: BlockType): Block {
  return blockSchema.parse({ type } as { type: BlockType });
}

/* Тело из БД — это unknown[]. Битый блок выкидываем, а не роняем всю страницу:
   одна кривая запись не должна класть сайт. */
export function parseBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  const out: Block[] = [];
  for (const item of value) {
    const parsed = blockSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}
