import type { NextConfig } from 'next';

/* Публичный хост объектного хранилища known только из env — если он не задан,
   remotePatterns остаётся пустым и next/image работает только с локальными файлами. */
const publicMedia = process.env.S3_PUBLIC_URL;

const config: NextConfig = {
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
