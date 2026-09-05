import type { NextConfig } from 'next';

/* Публичный хост объектного хранилища known только из env — если он не задан,
   remotePatterns остаётся пустым и next/image работает только с локальными файлами. */
const publicMedia = process.env.S3_PUBLIC_URL;

const config: NextConfig = {
  /* Standalone-сборка тащит в образ только нужные модули: итоговый слой
     в разы легче, чем весь node_modules. */
  output: 'standalone',
  experimental: {
    /* Лимит общий на все Server Actions, включая открытую всем форму заявки,
       поэтому держим его настолько низким, насколько позволяет медиатека:
       один файл до 20 МБ плюс запас на кодирование. Пачку фото грузим партиями. */
    serverActions: { bodySizeLimit: '30mb' },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
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
