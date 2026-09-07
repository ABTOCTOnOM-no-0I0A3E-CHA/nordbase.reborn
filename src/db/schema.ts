import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/* ---------------------------------------------------------------- общее */

export const statusEnum = pgEnum('status', ['draft', 'published']);
export const roleEnum = pgEnum('role', ['owner', 'manager']);
export const requestStatusEnum = pgEnum('request_status', [
  'new',
  'in_work',
  'confirmed',
  'cancelled',
]);
export const bookingStatusEnum = pgEnum('booking_status', ['hold', 'confirmed', 'cancelled']);

/* Тело страницы, домика, тура и сезона — один и тот же блочный формат.
   Разбирается через z.discriminatedUnion в lib/blocks, поэтому здесь просто jsonb. */
const body = () => jsonb('body').$type<unknown[]>().notNull().default([]);

/* Произвольные характеристики, которые клиент добавляет сам: «Wi-Fi» → «есть».
   Заменяет Content-Type Builder для 90% случаев «нужно ещё одно поле». */
const meta = () =>
  jsonb('meta').$type<{ label: string; value: string }[]>().notNull().default([]);

/* ---------------------------------------------------------------- доступы */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: roleEnum('role').notNull().default('manager'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/* Хранится SHA-256 от токена, а не сам токен: утечка дампа БД не даёт войти. */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

/* ---------------------------------------------------------------- медиа */

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  mime: text('mime').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  size: integer('size').notNull(),
  alt: text('alt').notNull().default(''),
  blurhash: text('blurhash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------------- страницы */

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ogMediaId: uuid('og_media_id').references(() => media.id, { onDelete: 'set null' }),
    body: body(),
    status: statusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('pages_slug_idx').on(t.slug)],
);

/* Снапшот всего тела на момент публикации — для отката одной кнопкой. */
export const pageVersions = pgTable(
  'page_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    snapshot: jsonb('snapshot').notNull(),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('page_versions_page_idx').on(t.pageId, t.createdAt)],
);

/* ---------------------------------------------------------------- домики */

export const houses = pgTable(
  'houses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    capacity: integer('capacity').notNull().default(4),
    pricePerNight: integer('price_per_night'),
    coverId: uuid('cover_id').references(() => media.id, { onDelete: 'set null' }),
    body: body(),
    meta: meta(),
    sort: integer('sort').notNull().default(0),
    status: statusEnum('status').notNull().default('draft'),
  },
  (t) => [uniqueIndex('houses_slug_idx').on(t.slug)],
);

export const houseMedia = pgTable(
  'house_media',
  {
    houseId: uuid('house_id')
      .notNull()
      .references(() => houses.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [uniqueIndex('house_media_idx').on(t.houseId, t.mediaId)],
);

/* ---------------------------------------------------------------- туры */

export const tours = pgTable(
  'tours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    days: integer('days').notNull().default(2),
    price: integer('price'),
    coverId: uuid('cover_id').references(() => media.id, { onDelete: 'set null' }),
    body: body(),
    meta: meta(),
    sort: integer('sort').notNull().default(0),
    status: statusEnum('status').notNull().default('draft'),
  },
  (t) => [uniqueIndex('tours_slug_idx').on(t.slug)],
);

/* Программа тура: день → упорядоченные точки маршрута. */
export const tourDays = pgTable(
  'tour_days',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tourId: uuid('tour_id')
      .notNull()
      .references(() => tours.id, { onDelete: 'cascade' }),
    dayNo: integer('day_no').notNull(),
    title: text('title').notNull().default(''),
  },
  (t) => [uniqueIndex('tour_days_idx').on(t.tourId, t.dayNo)],
);

export const tourStops = pgTable(
  'tour_stops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tourDayId: uuid('tour_day_id')
      .notNull()
      .references(() => tourDays.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    isFinish: boolean('is_finish').notNull().default(false),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('tour_stops_day_idx').on(t.tourDayId, t.sort)],
);

/* ---------------------------------------------------------------- Териберка */

export const seasons = pgTable(
  'seasons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    accent: text('accent').notNull().default('ice'),
    coverId: uuid('cover_id').references(() => media.id, { onDelete: 'set null' }),
    body: body(),
    sort: integer('sort').notNull().default(0),
    status: statusEnum('status').notNull().default('draft'),
  },
  (t) => [uniqueIndex('seasons_slug_idx').on(t.slug)],
);

/* ---------------------------------------------------------------- справочники */

export const prices = pgTable(
  'prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    group: text('group').notNull().default('base'),
    title: text('title').notNull(),
    note: text('note').notNull().default(''),
    amount: integer('amount'),
    unit: text('unit').notNull().default(''),
    sort: integer('sort').notNull().default(0),
    visible: boolean('visible').notNull().default(true),
  },
  (t) => [index('prices_group_idx').on(t.group, t.sort)],
);

export const faq = pgTable('faq', {
  id: uuid('id').primaryKey().defaultRandom(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sort: integer('sort').notNull().default(0),
  visible: boolean('visible').notNull().default(true),
});

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  author: text('author').notNull(),
  text: text('text').notNull(),
  rating: integer('rating'),
  source: text('source').notNull().default(''),
  mediaId: uuid('media_id').references(() => media.id, { onDelete: 'set null' }),
  sort: integer('sort').notNull().default(0),
  visible: boolean('visible').notNull().default(true),
});

/* Меню, контакты, SEO по умолчанию, тема — всё, что клиент правит в «Настройках». */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------------- заявки и брони */

/* Заявка — это намерение гостя. Она может не стать бронью. */
export const requests = pgTable(
  'requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    direction: text('direction').notNull().default(''),
    tourId: uuid('tour_id').references(() => tours.id, { onDelete: 'set null' }),
    houseId: uuid('house_id').references(() => houses.id, { onDelete: 'set null' }),
    dateFrom: date('date_from'),
    dateTo: date('date_to'),
    guests: integer('guests').notNull().default(1),
    meals: boolean('meals').notNull().default(false),
    banya: boolean('banya').notNull().default(false),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    comment: text('comment').notNull().default(''),
    status: requestStatusEnum('status').notNull().default('new'),
    /* 152-ФЗ: фиксируем факт и момент согласия на обработку персональных данных. */
    consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('requests_status_idx').on(t.status, t.createdAt)],
);

/* Телефоны и браузеры, подписанные на уведомления о заявках.

   Владелец добавляет панель на главный экран и разрешает уведомления — сюда
   попадает адрес его устройства. Каналов доставки несколько намеренно:
   Telegram в России ходит через прокси, а прокси однажды отвалится. */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /* Адрес, выданный браузером; он же уникальный ключ устройства. */
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    /* Чтобы владелец узнал своё устройство в списке. */
    label: text('label').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('push_endpoint_idx').on(t.endpoint)],
);

/* Бронь — это занятая дата. Единственный источник занятости и для сайта,
   и для календаря в админке. Может прийти из звонка, без заявки. */
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    houseId: uuid('house_id')
      .notNull()
      .references(() => houses.id, { onDelete: 'cascade' }),
    requestId: uuid('request_id').references(() => requests.id, { onDelete: 'set null' }),
    dateFrom: date('date_from').notNull(),
    dateTo: date('date_to').notNull(),
    /* Сколько человек в этой брони. Домик — не единственный ограниченный
       ресурс: вездеход берёт до 8 человек за поездку, поэтому владельцу нужно
       видеть не только «занято», но и сколько людей стоит на дату. */
    guests: integer('guests').notNull().default(0),
    status: bookingStatusEnum('status').notNull().default('hold'),
    note: text('note').notNull().default(''),
  },
  (t) => [index('bookings_house_range_idx').on(t.houseId, t.dateFrom, t.dateTo)],
);
