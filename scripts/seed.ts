/* Наполняет пустую базу реальным контентом: тексты и цены — из прототипа,
   фотографии — из старого сайта (C:/work/nordbase/public).

   ВНИМАНИЕ: перед вставкой чистит контентные таблицы. Учётки не трогает.
   bun scripts/seed.ts [путь-к-public-старого-сайта] */

import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

process.loadEnvFile?.('.env');

if (process.env.NODE_ENV === 'production') {
  console.error('Отказываюсь чистить боевую базу. NODE_ENV=production');
  process.exit(1);
}

const { db } = await import('../src/db/index');
const s = await import('../src/db/schema');
const { processImage } = await import('../src/lib/images');
const storage = await import('../src/lib/storage');

const LEGACY = process.argv[2] ?? 'C:/work/nordbase/public';

/* ------------------------------------------------------------------ фото */

const imported = new Map<string, string>();

async function photo(relativePath: string, alt: string): Promise<string | null> {
  const cached = imported.get(relativePath);
  if (cached) return cached;

  try {
    const source = await readFile(join(LEGACY, relativePath));
    const processed = await processImage(source);
    const key = storage.buildKey(processed.extension);
    await storage.put(key, processed.body);

    const [row] = await db
      .insert(s.media)
      .values({
        key,
        mime: processed.mime,
        width: processed.width,
        height: processed.height,
        size: processed.size,
        alt,
        blurhash: processed.placeholder,
      })
      .returning({ id: s.media.id });

    if (!row) return null;
    imported.set(relativePath, row.id);
    console.log(`  фото: ${relativePath} → ${processed.width}×${processed.height}`);
    return row.id;
  } catch {
    console.warn(`  пропущено (нет файла): ${relativePath}`);
    return null;
  }
}

/* ------------------------------------------------------------- очистка */

console.log('Чищу контентные таблицы…');
await db.delete(s.tourStops);
await db.delete(s.tourDays);
await db.delete(s.bookings);
await db.delete(s.requests);
await db.delete(s.houseMedia);
await db.delete(s.pageVersions);
await db.delete(s.pages);
await db.delete(s.houses);
await db.delete(s.tours);
await db.delete(s.seasons);
await db.delete(s.prices);
await db.delete(s.faq);
await db.delete(s.reviews);
await db.delete(s.settings);
await db.delete(s.media);

console.log('Переношу фотографии со старого сайта…');

const heroMain = await photo('root/hero.webp', 'Северное сияние над Кольским полуостровом');
const heroRybachiy = await photo('rybachiy/hero/hero.webp', 'Полуостров Рыбачий');
const heroTeriberka = await photo('teriberka/hero.webp', 'Териберка на берегу Баренцева моря');
const truck = await photo('root/truck.webp', 'Вездеход базы «Север»');
const comfort = await photo('root/comfort.webp', 'Интерьер эко-дома');

const winter = await photo('teriberka/lightning.jpg', 'Северное сияние над Териберкой зимой');
const spring = await photo('teriberka/vesna.jpg', 'Весенняя Териберка');
const summer = await photo('teriberka/summer.jpg', 'Летняя Териберка, Баренцево море');
const autumn = await photo('teriberka/autumn.jpg', 'Осенние краски Териберки');

const house1Cover = await photo('rybachiy/houses/1/panorama.webp', 'Дом 1, вид снаружи');
const house1Living = await photo('rybachiy/houses/1/livingRoom.webp', 'Гостиная дома 1');
const house1Kitchen = await photo('rybachiy/houses/1/kitchen.webp', 'Кухня дома 1');
const house1Second = await photo('rybachiy/houses/1/secondFloor.webp', 'Второй этаж дома 1');

const house2Cover = await photo('rybachiy/houses/2/panorama.jpg', 'Дом 2, вид снаружи');
const house2Living = await photo('rybachiy/houses/2/livingroom.jpg', 'Гостиная дома 2');

const galleryIds = (
  await Promise.all([
    photo('rybachiy/attractions/capes/myis.webp', 'Мыс Немецкий'),
    photo('rybachiy/attractions/capes/myis1.webp', 'Мыс Кекурский'),
    photo('rybachiy/attractions/brothers and waterfall/dvabrata.webp', 'Два брата, рыжие камни'),
    photo('rybachiy/attractions/brothers and waterfall/vodopad.webp', 'Водопад на Рыбачьем'),
    photo('rybachiy/attractions/orange stones/orangerocks.webp', 'Рыжие камни'),
    photo('rybachiy/attractions/north lightning/nordlightning.webp', 'Северное сияние'),
  ])
).filter((id): id is string => id !== null);

/* Всё остальное со старого сайта — в медиатеку. Роли (обложки, галереи)
   расставлены выше вручную; здесь просто складываем оставшиеся снимки, чтобы
   владельцу было из чего выбирать в админке и не пришлось искать их по папкам. */

async function importRest(): Promise<number> {
  const { readdir } = await import('node:fs/promises');
  const extensions = ['.jpg', '.jpeg', '.png', '.webp'];

  async function walk(dir: string): Promise<string[]> {
    const entries = await readdir(join(LEGACY, dir), { withFileTypes: true });
    const found: string[] = [];
    for (const entry of entries) {
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        found.push(...(await walk(relative)));
      } else if (extensions.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
        found.push(relative);
      }
    }
    return found;
  }

  let added = 0;
  try {
    for (const relative of (await walk('')).sort()) {
      if (imported.has(relative)) continue;
      /* Описание собираем из пути: «rybachiy/attractions/capes/myis.webp» →
         «rybachiy attractions capes myis». Черновое, но осмысленное — владелец
         поправит в медиатеке, а пустое поле подсвечивается на панели. */
      const alt = relative
        .replace(/\.[a-z0-9]+$/i, '')
        .split('/')
        .join(' ')
        .replace(/[-_]+/g, ' ')
        .trim();
      if (await photo(relative, alt)) added += 1;
    }
  } catch {
    console.warn('  не удалось обойти папку со старыми фото — пропускаю');
  }
  return added;
}

const restCount = await importRest();
console.log(`Дополнительно перенесено в медиатеку: ${restCount}`);

/* ---------------------------------------------------------------- домики */

console.log('Создаю домики, туры и сезоны…');

const houseRows = await db
  .insert(s.houses)
  .values([
    {
      slug: 'dom-1',
      title: 'Дом 1',
      summary: 'Двухэтажный дом со всеми удобствами, кухня и панорамный вид.',
      capacity: 6,
      pricePerNight: 5500,
      coverId: house1Cover,
      sort: 1,
      status: 'published',
      meta: [
        { label: 'Этажей', value: '2' },
        { label: 'Душ и туалет', value: 'в доме, горячая вода' },
        { label: 'Кухня', value: 'оборудована' },
      ],
      body: [
        {
          type: 'text',
          eyebrow: '',
          title: 'О доме',
          subtitle: '',
          body: 'Эко-дом со всеми удобствами: душ, туалет и горячая вода в доме, оборудованная кухня, спальные места на двух этажах.\n\nИз окон — вид на тундру и море. Рассчитан на 4–6 гостей.',
        },
        {
          type: 'gallery',
          eyebrow: '',
          title: 'Фотографии',
          subtitle: '',
          mediaIds: [house1Cover, house1Living, house1Kitchen, house1Second].filter(
            (x): x is string => x !== null,
          ),
        },
      ],
    },
    {
      slug: 'dom-2',
      title: 'Дом 2',
      summary: 'Дом со всеми удобствами и просторной гостиной, 4–6 гостей.',
      capacity: 6,
      pricePerNight: 5500,
      coverId: house2Cover,
      sort: 2,
      status: 'published',
      meta: [
        { label: 'Душ и туалет', value: 'в доме, горячая вода' },
        { label: 'Кухня', value: 'оборудована' },
      ],
      body: [
        {
          type: 'text',
          eyebrow: '',
          title: 'О доме',
          subtitle: '',
          body: 'Эко-дом со всеми удобствами и просторной гостиной. Душ, туалет и горячая вода в доме, оборудованная кухня. Рассчитан на 4–6 гостей.',
        },
        {
          type: 'gallery',
          eyebrow: '',
          title: 'Фотографии',
          subtitle: '',
          mediaIds: [house2Cover, house2Living].filter((x): x is string => x !== null),
        },
      ],
    },
    {
      slug: 'dom-3',
      title: 'Дом 3',
      summary: 'Третий дом базы. Фотографии и описание добавим по вашим материалам.',
      capacity: 4,
      pricePerNight: 5500,
      coverId: null,
      sort: 3,
      status: 'draft',
      meta: [],
      body: [],
    },
  ])
  .returning({ id: s.houses.id, slug: s.houses.slug });

const houseBySlug = new Map(houseRows.map((h) => [h.slug, h.id]));

for (const [houseSlug, ids] of [
  ['dom-1', [house1Cover, house1Living, house1Kitchen, house1Second]],
  ['dom-2', [house2Cover, house2Living]],
] as const) {
  const houseId = houseBySlug.get(houseSlug);
  if (!houseId) continue;
  const values = ids
    .filter((id): id is string => id !== null)
    .map((mediaId, index) => ({ houseId, mediaId, sort: index }));
  if (values.length > 0) await db.insert(s.houseMedia).values(values);
}

/* ------------------------------------------------------------------ туры */

const DAY_1 = [
  'Встреча в Титовке',
  'Каскад водопадов Мельничный',
  'Смотровая дельта Титовки',
  'Пьяный ручей',
  'Смотровая площадка на перевале',
  'Водопад Аватар',
  'Смотровая площадка на Губу',
  'Малая Волоковая',
  'Батарея (Пушки)',
  'Два брата, рыжие камни',
  'База отдыха «Север»',
];

const LAST_DAY = [
  'Берег моря «Литораль»',
  'Мыс Немецкий',
  'Мыс Кекурский',
  'Гарнизон «Скоробеевский»',
  'Возвращение в Титовку',
];

const MIDDLE_DAY = [
  'Губа Зубовская',
  'Олени',
  'Водопады',
  'Древние писаницы',
  'Возвращение на базу',
];

const tourRows = await db
  .insert(s.tours)
  .values([
    {
      slug: 'dvuhdnevnyy',
      title: 'Двухдневный тур',
      summary:
        'Классический маршрут по полуострову: водопады, смотровые, батарея и мысы. Ночёвка на базе, заброска на вездеходе включена.',
      days: 2,
      price: null,
      coverId: heroRybachiy,
      sort: 1,
      status: 'published',
      meta: [
        { label: 'Встреча', value: 'Титовка' },
        { label: 'Вездеход', value: 'входит в стоимость' },
        { label: 'Пропуск в погранзону', value: 'оформляем сами' },
      ],
      body: [],
    },
    {
      slug: 'trehdnevnyy',
      title: 'Трёхдневный тур',
      summary:
        'Тот же маршрут плюс отдельный день на Губу Зубовскую, оленей, водопады и древние писаницы.',
      days: 3,
      price: null,
      coverId: heroRybachiy,
      sort: 2,
      status: 'published',
      meta: [
        { label: 'Встреча', value: 'Титовка' },
        { label: 'Вездеход', value: 'входит в стоимость' },
        { label: 'Пропуск в погранзону', value: 'оформляем сами' },
      ],
      body: [],
    },
  ])
  .returning({ id: s.tours.id, slug: s.tours.slug });

const tourBySlug = new Map(tourRows.map((t) => [t.slug, t.id]));

const programs: Record<string, string[][]> = {
  dvuhdnevnyy: [DAY_1, LAST_DAY],
  trehdnevnyy: [DAY_1, MIDDLE_DAY, LAST_DAY],
};

for (const [slug, days] of Object.entries(programs)) {
  const tourId = tourBySlug.get(slug);
  if (!tourId) continue;

  for (const [index, stops] of days.entries()) {
    const [day] = await db
      .insert(s.tourDays)
      .values({ tourId, dayNo: index + 1, title: `День ${index + 1}` })
      .returning({ id: s.tourDays.id });
    if (!day) continue;

    await db.insert(s.tourStops).values(
      stops.map((title, i) => ({
        tourDayId: day.id,
        title,
        sort: i,
        /* последняя точка дня — это финиш, в вёрстке она выделяется */
        isFinish: i === stops.length - 1,
      })),
    );
  }
}

/* --------------------------------------------------------------- сезоны */

await db.insert(s.seasons).values([
  {
    slug: 'zima',
    title: 'Зима',
    accent: 'violet',
    coverId: winter,
    sort: 1,
    status: 'published',
    body: [
      {
        type: 'text',
        eyebrow: 'Териберка',
        title: 'Зима',
        subtitle: '',
        body: 'Погрузитесь в зимнюю сказку Териберки. Арктические пейзажи, охота за северным сиянием и катание на снегоходах. Ощутите мощь зимней природы на краю света!',
      },
    ],
  },
  {
    slug: 'vesna',
    title: 'Весна',
    accent: 'aurora',
    coverId: spring,
    sort: 2,
    status: 'published',
    body: [
      {
        type: 'text',
        eyebrow: 'Териберка',
        title: 'Весна',
        subtitle: '',
        body: 'Пробуждение природы и начало полярного дня. Прогулки по цветущим тундрам, таяние снега и миграция птиц — красота весенней Арктики!',
      },
    ],
  },
  {
    slug: 'leto',
    title: 'Лето',
    accent: 'ice',
    coverId: summer,
    sort: 3,
    status: 'published',
    body: [
      {
        type: 'text',
        eyebrow: 'Териберка',
        title: 'Лето',
        subtitle: '',
        body: 'Лето под светом полярного солнца. Дикие пляжи и величественные скалы, бесконечные дни и мощь арктического океана!',
      },
    ],
  },
  {
    slug: 'osen',
    title: 'Осень',
    accent: 'amber',
    coverId: autumn,
    sort: 4,
    status: 'published',
    body: [
      {
        type: 'text',
        eyebrow: 'Териберка',
        title: 'Осень',
        subtitle: '',
        body: 'Буйство красок и свежесть арктического воздуха. Золотистые тундры, виды на океан, ягоды и грибы, спокойствие осеннего края.',
      },
    ],
  },
]);

/* ----------------------------------------------------------------- цены */

await db.insert(s.prices).values([
  {
    group: 'base',
    title: 'Заброска на вездеходе',
    note: 'Встреча и возврат в Титовке, до 8 человек в поездке',
    amount: null,
    unit: 'входит в тур',
    sort: 1,
  },
  {
    group: 'base',
    title: 'Проживание',
    note: 'Эко-дома со всеми удобствами, 4–6 человек',
    amount: 5500,
    unit: 'с человека в сутки',
    sort: 2,
  },
  {
    group: 'base',
    title: 'Питание',
    note: 'Завтрак, перекус в пути, ужин из двух блюд. По предзаказу',
    amount: 2500,
    unit: 'с человека в день',
    sort: 3,
  },
  {
    group: 'extra',
    title: 'Вездеход отдельно, без тура',
    note: 'На группу. Базовая вместимость 4 человека, в поездке до 8',
    amount: 40000,
    unit: 'в день',
    sort: 4,
  },
  {
    group: 'extra',
    title: 'Баня',
    note: 'За сеанс, по записи. Цену уточняйте',
    amount: null,
    unit: '',
    sort: 5,
  },
  {
    group: 'extra',
    title: 'Тур по Териберке',
    note: 'За человека, любой сезон',
    amount: null,
    unit: '',
    sort: 6,
  },
  {
    group: 'extra',
    title: 'Пропуск в погранзону',
    note: 'Оформляем сами, нужен паспорт. Входит в тур',
    amount: null,
    unit: '',
    sort: 7,
  },
]);

/* ---------------------------------------------------------------- вопросы */

await db.insert(s.faq).values(
  [
    [
      'Нужен ли пропуск на полуостров Рыбачий?',
      'Да, это пограничная зона. Документы оформляем сами — от вас нужны паспортные данные заранее.',
    ],
    [
      'Из чего складывается стоимость?',
      'Заброска на вездеходе входит в стоимость тура. Отдельно считаются проживание — 5 500 ₽ с человека в сутки и питание — 2 500 ₽ с человека в день. Баня и туры по Териберке — по запросу.',
    ],
    [
      'Сколько человек берёте в поездку?',
      'Базовая вместимость вездехода — 4 человека, всего в поездку берём до 8. Домики рассчитаны на 4–6 гостей.',
    ],
    [
      'Где встречаемся?',
      'В Титовке — оттуда забираем на вездеходе и туда же возвращаем в последний день тура.',
    ],
    [
      'Что есть на базе?',
      'Три эко-дома со всеми удобствами, душ и туалет с горячей водой, баня по записи. Питание готовим на базе по предзаказу.',
    ],
    [
      'Когда лучше ехать?',
      'Зимой — за сиянием и снегоходами, весной — за полярным днём и птицами, летом — за пляжами и скалами, осенью — за красками, ягодами и грибами.',
    ],
  ].map(([question, answer], index) => ({ question: question!, answer: answer!, sort: index })),
);

/* ------------------------------------------------------------- настройки */

await db.insert(s.settings).values({
  key: 'site',
  value: {
    brandName: 'NORDBASE',
    legalName: 'База отдыха «Север»',
    seoTitle: 'База отдыха «Север» — Рыбачий и Териберка',
    seoDescription:
      'Своя база на полуострове Рыбачий и авторские туры по Териберке. Заброска на вездеходе входит в стоимость тура, пропуск в погранзону оформляем сами.',
    ctaLabel: 'Оставить заявку',
    /* Карточка базы в Яндекс.Картах — взята со старого сайта. */
    reviewsUrl: 'https://yandex.ru/maps/org/52469441447/reviews/',
    reviewsLabel: 'Смотреть отзывы на Яндекс.Картах',
    directions: ['Полуостров Рыбачий', 'Териберка', 'Ещё не решили'],
    phone: '+7 911 802-86-14',
    telegram: 'https://t.me/+79118028614',
    whatsapp: 'https://wa.me/79118028614',
    vk: 'https://vk.com/bazasever51',
    address: 'Мурманская область, полуостров Рыбачий',
    lat: 69.785748,
    lng: 32.102471,
    menu: [
      { label: 'Рыбачий', href: '/rybachiy' },
      { label: 'Туры', href: '/rybachiy/tury' },
      { label: 'Териберка', href: '/teriberka' },
      { label: 'Транспорт', href: '/transport' },
      { label: 'Цены', href: '/ceny' },
      { label: 'Отзывы', href: '/otzyvy' },
      { label: 'Контакты', href: '/contacts' },
    ],
  },
});

/* ------------------------------------------------------------- страницы */

console.log('Собираю страницы из блоков…');

const heading = (eyebrow = '', title = '', subtitle = '') => ({ eyebrow, title, subtitle });

await db.insert(s.pages).values([
  {
    slug: '',
    title: 'Главная',
    seoTitle: 'База отдыха «Север» — Рыбачий и Териберка',
    seoDescription:
      'Своя база на полуострове Рыбачий и авторские туры по Териберке. Заброска на вездеходе, пропуск в погранзону оформляем сами.',
    status: 'published',
    publishedAt: new Date(),
    body: [
      {
        type: 'hero',
        ...heading('База отдыха «Север»', 'Погрузитесь в магию Кольского полуострова'),
        lead: 'Своя база на полуострове Рыбачий и авторские туры по Териберке. Заброска на вездеходе входит в стоимость тура, пропуск в погранзону оформляем сами — от вас только паспорт.',
        mediaId: heroMain,
        aurora: true,
        primaryLabel: 'Оставить заявку',
        primaryHref: '#request',
        secondaryLabel: 'Смотреть туры',
        secondaryHref: '/rybachiy/tury',
        cards: [
          {
            title: 'Северное сияние',
            text: 'Окрашивает ночное небо в разноцветные оттенки, создавая неповторимую атмосферу и красоту, доступную здесь в зимнее время.',
            href: '/teriberka/zima',
            accent: 'violet',
          },
          {
            title: 'Полуостров Рыбачий',
            text: 'Наши уютные домики в окружении красивой природы с видом на море или лес. Идеальное место для отдыха и исследования региона.',
            href: '/rybachiy',
            accent: 'aurora',
          },
          {
            title: 'Посёлок Териберка',
            text: 'Маленький посёлок на Кольском полуострове с прекрасными видами на Баренцево море и традиционной арктической атмосферой.',
            href: '/teriberka',
            accent: 'ice',
          },
        ],
      },
      {
        type: 'textMedia',
        ...heading('Полуостров Рыбачий', 'Своя база на краю материка'),
        body: 'Рыбачий — это тундра, скалы и Баренцево море, куда обычная машина не доедет. Мы встречаем гостей в Титовке и забрасываем на базу на вездеходе.\n\nНа базе три эко-дома со всеми удобствами, баня по записи и питание по предзаказу. Пропуск в погранзону оформляем сами.',
        mediaId: comfort,
        side: 'right',
        badgeValue: '69.78° с.ш.',
        badgeLabel: 'широта базы «Север»',
      },
      { type: 'houses', ...heading('Где жить', 'Домики базы') },
      { type: 'tours', ...heading('Туры по Рыбачьему', 'Двухдневный и трёхдневный маршруты'), limit: 0 },
      {
        type: 'seasons',
        ...heading(
          'Посёлок Териберка',
          'Туры по Териберке — круглый год',
          'Северное сияние, кладбище кораблей, водопад у самого моря и Китовый мыс. Териберка меняется каждые три месяца до неузнаваемости — выбирайте сезон.',
        ),
      },
      {
        type: 'textMedia',
        ...heading('Продвинутый транспорт', 'Вездеход довезёт туда, куда обычная машина не дойдёт'),
        body: 'Мы гордимся своим транспортом: вездеход обеспечит комфорт и безопасность даже в самых труднодоступных местах. Встречаем гостей в Титовке и забрасываем на базу сами — дорога на Рыбачий обычной машине не по силам.',
        mediaId: truck,
        side: 'left',
        badgeValue: 'до 8',
        badgeLabel: 'человек в поездке',
      },
      { type: 'prices', ...heading('Цены', 'Сколько стоит поездка'), group: 'base' },
      {
        type: 'requestForm',
        ...heading(
          'Заявка',
          'Оставьте заявку — перезвоним',
          'Заполните форму: даты, домик и число гостей. Заявка придёт нам сразу и в том же виде, в каком мы записали бы её по телефону.',
        ),
      },
      { type: 'reviews', ...heading('Отзывы', 'Что говорят гости') },
      { type: 'faq', ...heading('Вопросы', 'О чём спрашивают чаще всего') },
    ],
  },
  {
    slug: 'rybachiy',
    title: 'Полуостров Рыбачий',
    seoTitle: 'База «Север» на полуострове Рыбачий — домики и инфраструктура',
    seoDescription:
      'Эко-дома со всеми удобствами, баня, питание и заброска на вездеходе от Титовки.',
    status: 'published',
    publishedAt: new Date(),
    body: [
      {
        type: 'hero',
        ...heading('Полуостров Рыбачий', 'Домики и инфраструктура базы'),
        lead: 'Три эко-дома, баня и питание. Вместимость от 4 до 6 человек.',
        mediaId: heroRybachiy,
        aurora: false,
        primaryLabel: 'Оставить заявку',
        primaryHref: '/#request',
        secondaryLabel: '',
        secondaryHref: '',
        cards: [],
      },
      { type: 'houses', ...heading('', 'Домики базы') },
      {
        type: 'cards',
        ...heading('Инфраструктура', 'Что есть на базе'),
        columns: 4,
        items: [
          { title: 'Душ и туалет', text: 'На базе, горячая вода', href: '' },
          { title: 'Баня', text: 'По записи, за отдельную плату', href: '' },
          { title: 'Питание от базы', text: 'Завтрак, перекус в пути, ужин', href: '' },
          { title: 'Заброска', text: 'Вездеход от Титовки', href: '' },
        ],
      },
      { type: 'gallery', ...heading('Что вокруг', 'Полуостров в фотографиях'), mediaIds: galleryIds },
      { type: 'cta', ...heading('', 'Готовы приехать?'), label: 'Оставить заявку', href: '/#request' },
    ],
  },
  {
    slug: 'rybachiy/tury',
    title: 'Туры по Рыбачьему',
    seoTitle: 'Туры по полуострову Рыбачий — двухдневный и трёхдневный',
    seoDescription:
      'Полная программа по дням: водопады, смотровые, батарея, мысы. Пропуск в погранзону оформляем сами.',
    status: 'published',
    publishedAt: new Date(),
    body: [
      {
        type: 'text',
        ...heading(
          'Туры по Рыбачьему',
          'Двухдневный и трёхдневный маршруты',
          'Полная программа по дням. Пропуск в погранзону оформляем сами; трансфер, проживание и питание считаются отдельно.',
        ),
        body: '',
      },
      { type: 'tours', ...heading('', ''), limit: 0 },
      { type: 'prices', ...heading('Цены', 'Из чего складывается поездка'), group: 'base' },
      { type: 'requestForm', ...heading('Заявка', 'Забронировать тур') },
    ],
  },
  {
    slug: 'teriberka',
    title: 'Териберка',
    seoTitle: 'Туры по Териберке — круглый год',
    seoDescription:
      'Северное сияние, кладбище кораблей, водопад у самого моря и Китовый мыс. Четыре сезона — четыре разные поездки.',
    status: 'published',
    publishedAt: new Date(),
    body: [
      {
        type: 'hero',
        ...heading('Посёлок Териберка', 'Туры по Териберке — круглый год'),
        lead: 'Северное сияние, кладбище кораблей, водопад у самого моря и Китовый мыс. Териберка меняется каждые три месяца до неузнаваемости.',
        mediaId: heroTeriberka,
        aurora: true,
        primaryLabel: 'Оставить заявку',
        primaryHref: '/#request',
        secondaryLabel: '',
        secondaryHref: '',
        cards: [],
      },
      { type: 'seasons', ...heading('', 'Выбирайте сезон') },
      {
        type: 'cards',
        ...heading('', 'Что сюда привлекает'),
        columns: 3,
        items: [
          {
            title: 'Северное сияние',
            text: 'Зимой и ранней весной Териберка — отличное место для наблюдения: северное расположение и минимальное световое загрязнение.',
            href: '',
          },
          {
            title: 'Кладбище кораблей',
            text: 'Одно из самых известных и фотографируемых мест: старые заброшенные корабли создают атмосферу таинственности и истории.',
            href: '',
          },
          {
            title: 'Водопад в Териберке',
            text: 'Живописный водопад недалеко от посёлка впадает прямо в Баренцево море. Путь к нему идёт через скалы и прибрежные ландшафты.',
            href: '',
          },
          {
            title: 'Китовый мыс',
            text: 'Захватывающие виды и возможность увидеть китов — если повезёт.',
            href: '',
          },
          {
            title: 'Заброшенные здания',
            text: 'Заброшенные дома и промышленные объекты придают месту особый шарм и помогают понять историю региона.',
            href: '',
          },
          {
            title: 'Полярный день и ночь',
            text: 'Летом солнце не заходит вовсе, зимой темно почти круглые сутки — в каждый сезон это совсем разные поездки.',
            href: '',
          },
        ],
      },
      { type: 'requestForm', ...heading('Заявка', 'Поехать в Териберку') },
    ],
  },
  {
    slug: 'transport',
    title: 'Транспорт и заброска',
    seoTitle: 'Заброска на вездеходе — база «Север»',
    seoDescription: 'Встречаем в Титовке и забрасываем на базу на вездеходе. До 8 человек в поездке.',
    status: 'published',
    publishedAt: new Date(),
    body: [
      {
        type: 'textMedia',
        ...heading('Продвинутый транспорт', 'Вездеход довезёт туда, куда обычная машина не дойдёт'),
        body: 'Мы гордимся своим транспортом: вездеход обеспечит комфорт и безопасность даже в самых труднодоступных местах.\n\nВстречаем гостей в Титовке и забрасываем на базу сами — дорога на Рыбачий обычной машине не по силам.',
        mediaId: truck,
        side: 'right',
        badgeValue: '',
        badgeLabel: '',
      },
      {
        type: 'facts',
        ...heading('', 'Вместимость'),
        items: [
          { value: '4 человека', label: 'базовая вместимость' },
          { value: 'до 8 человек', label: 'в поездке' },
          { value: 'Титовка', label: 'место встречи' },
          { value: '40 000 ₽', label: 'в день на группу' },
        ],
      },
      { type: 'cta', ...heading('', 'Спросить про заброску'), label: 'Оставить заявку', href: '/#request' },
    ],
  },
  {
    slug: 'ceny',
    title: 'Цены',
    seoTitle: 'Цены — база отдыха «Север»',
    seoDescription:
      'Вездеход 40 000 ₽ в день, проживание 5 500 ₽ с человека в сутки, питание 2 500 ₽ с человека в день.',
    status: 'published',
    publishedAt: new Date(),
    body: [
      {
        type: 'prices',
        ...heading(
          'Цены',
          'Сколько стоит поездка',
          'Заброска на вездеходе входит в стоимость тура. Отдельно считаются проживание и питание — итог собираем под ваши даты и количество гостей.',
        ),
        group: 'base',
      },
      { type: 'prices', ...heading('', 'Дополнительно'), group: 'extra' },
      { type: 'faq', ...heading('Вопросы', 'О чём спрашивают чаще всего') },
      { type: 'requestForm', ...heading('Заявка', 'Рассчитать поездку') },
    ],
  },
  {
    slug: 'contacts',
    title: 'Контакты',
    seoTitle: 'Контакты — база отдыха «Север»',
    seoDescription: 'Telegram и WhatsApp +7 911 802-86-14, сообщество ВКонтакте. База на полуострове Рыбачий.',
    status: 'published',
    publishedAt: new Date(),
    body: [
      {
        type: 'text',
        ...heading('Контакты', 'Напишите в удобный мессенджер', 'Telegram и WhatsApp: +7 911 802-86-14'),
        body: 'Отвечаем быстрее всего в мессенджерах. Если вопрос про даты — сразу напишите, сколько вас и на сколько дней.',
      },
      {
        type: 'map',
        ...heading('', 'Как нас найти'),
        orgId: '52469441447',
        lat: 69.785748,
        lng: 32.102471,
        zoom: 10,
      },
      { type: 'requestForm', ...heading('Заявка', 'Или оставьте заявку') },
    ],
  },
  {
    slug: 'otzyvy',
    title: 'Отзывы',
    seoTitle: 'Отзывы гостей — база отдыха «Север»',
    seoDescription: 'Отзывы гостей о базе на полуострове Рыбачий и турах по Териберке.',
    status: 'published',
    publishedAt: new Date(),
    body: [
      {
        type: 'text',
        ...heading(
          'Отзывы',
          'Что говорят гости',
          'Пока отзывы собираются на Яндекс.Картах. Свои отзывы можно добавить в админке, в разделе «Отзывы» — они появятся здесь же.',
        ),
        body: '',
      },
      { type: 'reviews', ...heading('', '') },
      { type: 'requestForm', ...heading('Заявка', 'Поехать к нам') },
    ],
  },
  {
    slug: 'policy',
    title: 'Политика обработки персональных данных',
    seoTitle: 'Политика обработки персональных данных',
    seoDescription: 'Как мы обрабатываем персональные данные, оставленные через форму на сайте.',
    status: 'published',
    publishedAt: new Date(),
    body: [
      {
        type: 'text',
        ...heading('', 'Политика обработки персональных данных'),
        body: 'Оставляя заявку на сайте, вы даёте согласие на обработку персональных данных: имени, номера телефона и содержания комментария.\n\nДанные используются только для того, чтобы связаться с вами по вашей заявке и согласовать поездку. Мы не передаём их третьим лицам и не используем для рассылок.\n\nДанные хранятся до тех пор, пока это нужно для обработки заявки. Чтобы отозвать согласие и удалить свои данные, напишите нам в Telegram или WhatsApp по номеру +7 911 802-86-14.\n\nЭто краткая версия. Полный текст политики в редакции владельца базы будет размещён здесь же.',
      },
    ],
  },
]);

const counts = {
  media: imported.size,
  houses: houseRows.length,
  tours: tourRows.length,
  pages: 9,
};

console.log('Готово:', counts);
process.exit(0);
