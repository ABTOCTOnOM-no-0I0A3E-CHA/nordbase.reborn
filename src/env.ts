import { z } from 'zod';

/* Незаполненная переменная в docker-compose приходит не как «нет значения», а
   как пустая строка, и проверка URL на ней падает. Для необязательных адресов
   пустая строка — это «не задано». */
const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.url().optional());

/* Падаем на старте, а не в рантайме на первой заявке. */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().min(1).default('nb_session'),
  /* Абсолютный адрес сайта для sitemap, robots и разметки JSON-LD. */
  SITE_URL: z.url().default('http://localhost:3000'),
  /* Полный запрет индексации. Нужен демо-стенду: пока сайт живёт на временном
     домене, он не должен попасть в поиск и конкурировать с боевым за те же
     запросы. При переезде строка убирается из .env — и всё включается назад. */
  SITE_NOINDEX: z
    .string()
    .optional()
    .transform((value) => value === '1' || value?.toLowerCase() === 'true'),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  /* Свой обратный прокси вместо api.telegram.org — для доступа из России. */
  TELEGRAM_API_BASE: optionalUrl,
  /* HTTP(S)-прокси с поддержкой CONNECT. SOCKS5 не поддерживается. */
  TELEGRAM_PROXY_URL: optionalUrl,

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Неверные переменные окружения:\n${issues}`);
}

export const env = parsed.data;
