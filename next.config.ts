import type { NextConfig } from 'next';

/* Публичный хост объектного хранилища known только из env — если он не задан,
   remotePatterns остаётся пустым и next/image работает только с локальными файлами. */
const publicMedia = process.env.S3_PUBLIC_URL;

/* На закрытом стенде запрет вешаем и заголовком: мета-тег виден только в
   HTML, а по ссылке могут утащить и картинку, и PDF. */
const noindex = process.env.SITE_NOINDEX === '1' || process.env.SITE_NOINDEX === 'true';

const config: NextConfig = {
  /* Standalone-сборка тащит в образ только нужные модули: итоговый слой
     в разы легче, чем весь node_modules. */
  output: 'standalone',
  experimental: {
    /* Стили уезжают в <head> прямо в разметку. Отдельный файл стилей
       блокировал первую отрисовку почти на секунду, а выигрыш от его
       кеширования нам почти не достаётся: гость приходит на сайт базы
       один-два раза за поездку, а не каждый день. */
    inlineCss: true,
    /* Лимит общий на все Server Actions, включая открытую всем форму заявки,
       поэтому держим его настолько низким, насколько позволяет медиатека:
       один файл до 20 МБ плюс запас на кодирование. Пачку фото грузим партиями. */
    serverActions: { bodySizeLimit: '30mb' },
  },
  async headers() {
    if (!noindex) return [];
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    /* 62 — для обложек: они затемнены и перекрыты градиентом, разницу с 75
       на глаз не видно, а вес заметно меньше. 75 остаётся для всего прочего. */
    qualities: [62, 75],
    remotePatterns: publicMedia
      ? [
          {
            protocol: new URL(publicMedia).protocol.replace(':', '') as 'http' | 'https',
            hostname: new URL(publicMedia).hostname,
          },
        ]
      : [],
  },
};

export default config;
