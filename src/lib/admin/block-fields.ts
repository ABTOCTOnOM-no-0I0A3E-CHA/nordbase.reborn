import type { BlockType } from '@/lib/blocks';
import type { IconName } from '@/components/admin/icons';

/* Описание полей каждого блока для редактора. Держим отдельно от zod-схемы
   намеренно: схема отвечает за корректность данных, а здесь — человеческие
   подписи и порядок полей. Выводить одно из другого пришлось бы магией,
   а подписи всё равно писать руками. */

export type FieldDef =
  | { kind: 'text'; name: string; label: string; placeholder?: string; wide?: boolean }
  | { kind: 'textarea'; name: string; label: string; rows?: number; hint?: string }
  /* Текст с форматированием: жирный, курсив, списки, ссылки. */
  | { kind: 'rich'; name: string; label: string; hint?: string }
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
    { kind: 'media', name: 'mediaId', label: 'Фоновое фото' },
    {
      kind: 'select',
      name: 'height',
      label: 'Высота блока',
      options: [
        { value: 'full', label: 'Во весь экран' },
        { value: 'compact', label: 'Невысокая, для внутренних страниц' },
      ],
    },
    ...heading,
    { kind: 'textarea', name: 'lead', label: 'Вводный текст', rows: 3 },
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
    { kind: 'rich', name: 'body', label: 'Текст' },
  ],

  textMedia: [
    ...heading,
    { kind: 'rich', name: 'body', label: 'Текст' },
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

  availability: [
    ...heading,
    { kind: 'checkbox', name: 'visible', label: 'Показывать календарь на сайте' },
    {
      kind: 'select',
      name: 'months',
      label: 'Сколько месяцев показывать',
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '6', label: '6' },
      ],
    },
  ],
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
  availability: 'Даты берутся из раздела «Занятость». Снимите галочку — блок пропадёт с сайта, настройки останутся.',
};

/* Значок и объяснение для каждого блока. Список «Добавить блок» без них
   выглядит как перечень терминов: «Цифры», «Плитки» — владелец не поймёт,
   что выбирает, пока не добавит и не посмотрит. */
export const BLOCK_ICONS: Record<BlockType, IconName> = {
  hero: 'layout',
  text: 'text',
  textMedia: 'media',
  cards: 'grid',
  facts: 'number',
  gallery: 'media',
  houses: 'house',
  tours: 'tour',
  seasons: 'season',
  prices: 'price',
  faq: 'faq',
  reviews: 'review',
  requestForm: 'form',
  availability: 'calendar',
  cta: 'plus',
  map: 'map',
};

export const BLOCK_ABOUT: Record<BlockType, string> = {
  hero: 'Большая картинка во весь экран с заголовком и кнопкой. Обычно первая на странице.',
  text: 'Просто текст с заголовком. Для рассказа о базе, условиях, правилах.',
  textMedia: 'Текст и фотография рядом. Хорошо смотрится в середине страницы.',
  cards: 'Несколько коротких плиток в ряд: удобства, преимущества, что взять с собой.',
  facts: 'Крупные цифры с подписями: вместимость, расстояние, стоимость.',
  gallery: 'Сетка фотографий из медиатеки.',
  houses: 'Карточки домиков. Содержимое берётся из раздела «Домики».',
  tours: 'Карточки туров. Содержимое берётся из раздела «Туры».',
  seasons: 'Четыре сезона Териберки. Содержимое берётся из раздела «Сезоны».',
  prices: 'Список цен. Содержимое берётся из раздела «Цены».',
  faq: 'Вопросы и ответы, раскрываются по клику. Берутся из раздела «Вопросы».',
  reviews: 'Отзывы гостей и ссылка на Яндекс.Карты. Берутся из раздела «Отзывы».',
  requestForm: 'Форма заявки. Поля фиксированы, гость заполняет и отправляет.',
  availability:
    'Календарь свободных дат. Гость видит, какие числа заняты, и не пишет «а свободно ли 12-е».',
  cta: 'Полоса с призывом и кнопкой. Когда формы на странице много, а подтолкнуть надо.',
  map: 'Карта Яндекса с карточкой базы. Загружается по клику гостя.',
};
