import type { NextConfig } from 'next';

/* Публичный хост объектного хранилища known только из env — если он не задан,
   remotePatterns остаётся пустым и next/image работает только с локальными файлами. */
const publicMedia = process.env.S3_PUBLIC_URL;

const config: NextConfig = {
  experimental: {
    /* Медиатека принимает до 20 МБ на файл и несколько файлов за раз —
       дефолтный лимит на тело Server Action (1 МБ) для этого мал. */
    serverActions: { bodySizeLimit: '80mb' },
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
