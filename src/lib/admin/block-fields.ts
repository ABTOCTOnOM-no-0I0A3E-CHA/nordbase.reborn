import type { BlockType } from '@/lib/blocks';

/* Описание полей каждого блока для редактора. Держим отдельно от zod-схемы
   намеренно: схема отвечает за корректность данных, а здесь — человеческие
   подписи и порядок полей. Выводить одно из другого пришлось бы магией,
   а подписи всё равно писать руками. */

export type FieldDef =
  | { kind: 'text'; name: string; label: string; placeholder?: string; wide?: boolean }
  | { kind: 'textarea'; name: string; label: string; rows?: number; hint?: string }
  | { kind: 'number'; name: string; label: string }
  | { kind: 'checkbox'; name: string; label: string }
  | { kind: 'select'; name: string; label: string; options: { value: string; label: string }[] }
  | { kind: 'media'; name: string; label: string }
  | { kind: 'mediaList'; name: string; label: string }
  | { kind: 'list'; name: string; label: string; itemLabel: string; fields: FieldDef[] };

const heading: FieldDef[] = [
  { kind: 'text', name: 'eyebrow', label: 'Надпись сверху', placeholder: 'База отдыха «Север»' },
  { kind: 'text', name: 'title', label: 'Заголовок', wide: true },
  { kind: 'textarea', name: 'subtitle', label: 'Подзаголовок', rows: 2 },
];

const accentOptions = [
  { value: 'aurora', label: 'Зелёный' },
  { value: 'ice', label: 'Голубой' },
  { value: 'violet', label: 'Фиолетовый' },
  { value: 'amber', label: 'Тёплый' },
];

export const BLOCK_FIELDS: Record<BlockType, FieldDef[]> = {
  hero: [
    ...heading,
    { kind: 'textarea', name: 'lead', label: 'Вводный текст', rows: 3 },
    { kind: 'media', name: 'mediaId', label: 'Фон' },
    { kind: 'checkbox', name: 'aurora', label: 'Анимированное северное сияние' },
    { kind: 'text', name: 'primaryLabel', label: 'Главная кнопка' },
    { kind: 'text', name: 'primaryHref', label: 'Ссылка главной кнопки', placeholder: '#request' },
    { kind: 'text', name: 'secondaryLabel', label: 'Вторая кнопка' },
    { kind: 'text', name: 'secondaryHref', label: 'Ссылка второй кнопки' },
    {
      kind: 'list',
      name: 'cards',
      label: 'Карточки под текстом',
      itemLabel: 'Карточка',
      fields: [
        { kind: 'text', name: 'title', label: 'Заголовок' },
        { kind: 'textarea', name: 'text', label: 'Текст', rows: 2 },
        { kind: 'text', name: 'href', label: 'Ссылка' },
        { kind: 'select', name: 'accent', label: 'Цвет точки', options: accentOptions },
      ],
    },
  ],

  text: [
    ...heading,
    {
      kind: 'textarea',
      name: 'body',
      label: 'Текст',
      rows: 8,
      hint: 'Пустая строка между абзацами разделяет их на сайте.',
    },
  ],

  textMedia: [
    ...heading,
    { kind: 'textarea', name: 'body', label: 'Текст', rows: 6 },
    { kind: 'media', name: 'mediaId', label: 'Фото' },
    {
      kind: 'select',
      name: 'side',
      label: 'Фото слева или справа',
      options: [
        { value: 'right', label: 'Справа' },
        { value: 'left', label: 'Слева' },
      ],
    },
    { kind: 'text', name: 'badgeValue', label: 'Плашка: крупная строка' },
    { kind: 'text', name: 'badgeLabel', label: 'Плашка: подпись' },
  ],

  cards: [
    ...heading,
    {
      kind: 'select',
      name: 'columns',
      label: 'Колонок',
      options: [
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
      ],
    },
    {
      kind: 'list',
      name: 'items',
      label: 'Карточки',
      itemLabel: 'Карточка',
      fields: [
        { kind: 'text', name: 'title', label: 'Заголовок' },
        { kind: 'textarea', name: 'text', label: 'Текст', rows: 2 },
        { kind: 'text', name: 'href', label: 'Ссылка' },
      ],
    },
  ],

  facts: [
    ...heading,
    {
      kind: 'list',
      name: 'items',
      label: 'Цифры',
      itemLabel: 'Цифра',
      fields: [
        { kind: 'text', name: 'value', label: 'Крупная строка', placeholder: 'до 8 человек' },
        { kind: 'text', name: 'label', label: 'Подпись', placeholder: 'в поездке' },
      ],
    },
  ],

  gallery: [...heading, { kind: 'mediaList', name: 'mediaIds', label: 'Фотографии' }],

  cta: [
    ...heading,
    { kind: 'text', name: 'label', label: 'Текст кнопки' },
    { kind: 'text', name: 'href', label: 'Ссылка кнопки' },
  ],

  map: [
    ...heading,
    {
      kind: 'text',
      name: 'orgId',
      label: 'ID организации в Яндексе',
      placeholder: '52469441447 — тогда покажется карточка базы',
      wide: true,
    },
    { kind: 'number', name: 'lat', label: 'Широта' },
    { kind: 'number', name: 'lng', label: 'Долгота' },
    { kind: 'number', name: 'zoom', label: 'Масштаб 1–19' },
  ],

  houses: [...heading, { kind: 'number', name: 'limit', label: 'Сколько показать (0 — все)' }],
  tours: [...heading, { kind: 'number', name: 'limit', label: 'Сколько показать (0 — все)' }],
  seasons: heading,
  prices: [
    ...heading,
    { kind: 'text', name: 'group', label: 'Группа цен', placeholder: 'base, extra или пусто' },
  ],
  faq: heading,
  reviews: heading,
  requestForm: heading,
};

/* Подсказка под названием блока в списке — чтобы владелец понимал, откуда
   берётся содержимое, и не искал, где вписать текст. */
export const BLOCK_HINTS: Partial<Record<BlockType, string>> = {
  houses: 'Содержимое берётся из раздела «Домики»',
  tours: 'Содержимое берётся из раздела «Туры»',
  seasons: 'Содержимое берётся из раздела «Сезоны»',
  prices: 'Содержимое берётся из раздела «Цены»',
  faq: 'Содержимое берётся из раздела «Вопросы»',
  reviews: 'Содержимое берётся из раздела «Отзывы»',
  requestForm: 'Форма заявки — поля фиксированы',
};
