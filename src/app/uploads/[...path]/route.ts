import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

/* Next в режиме standalone раздаёт только то, что лежало в public на момент
   сборки: список файлов фиксируется при билде. Фотографии же появляются позже,
   через админку, и без этого обработчика отдавали бы 404 в проде.

   В боевом compose Caddy перехватывает /uploads/* и отдаёт файлы с диска сам —
   этот маршрут остаётся запасным путём для dev и для запуска без прокси. */

const ROOT = join(process.cwd(), 'public', 'uploads');

/* Ключи генерирует buildKey: ГГГГ/ММ/<uuid>.<расширение>. Принимаем только их —
   заодно закрывает обход каталога любыми хитростями с кодированием. */
const KEY = /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i;

const MIME: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  avif: 'image/avif',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const key = (await params).path.join('/');
  if (!KEY.test(key)) return new Response('Not found', { status: 404 });

  const file = normalize(join(ROOT, key));
  /* Пояс поверх подтяжек: даже пройдя проверку ключа, путь обязан остаться
     внутри каталога загрузок. */
  if (!file.startsWith(ROOT + sep)) return new Response('Not found', { status: 404 });

  try {
    const info = await stat(file);
    if (!info.isFile()) return new Response('Not found', { status: 404 });

    const extension = key.slice(key.lastIndexOf('.') + 1).toLowerCase();
    const body = Readable.toWeb(createReadStream(file)) as WebReadableStream<Uint8Array>;

    return new Response(body as unknown as BodyInit, {
      headers: {
        'content-type': MIME[extension] ?? 'application/octet-stream',
        'content-length': String(info.size),
        /* Имя файла содержит uuid, значит содержимое по этому адресу
           не изменится никогда — кешируем максимально долго. */
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
