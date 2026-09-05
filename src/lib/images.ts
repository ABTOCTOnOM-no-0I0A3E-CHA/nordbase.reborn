/* Тот же случай, что и storage.ts: модуль нужен и серверу, и CLI-скриптам. */
import sharp from 'sharp';

/* Ограничение по длинной стороне: фотографии с телефона бывают по 6000px,
   в вёрстке столько не нужно никогда, а вес растёт кратно. */
const MAX_EDGE = 2560;

/* Крошечное превью в data:URI вместо blurhash — та же польза, минус зависимость. */
const PLACEHOLDER_EDGE = 16;

export type ProcessedImage = {
  body: Buffer;
  extension: 'webp';
  mime: 'image/webp';
  width: number;
  height: number;
  size: number;
  placeholder: string;
};

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  /* rotate() без аргументов применяет EXIF-ориентацию: иначе фото с телефона
     кладётся набок. failOn:'none' — битый хвост файла не должен ронять загрузку. */
  const pipeline = sharp(input, { failOn: 'none' }).rotate();

  const meta = await pipeline.metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Не удалось прочитать размеры изображения');
  }

  const body = await pipeline
    .clone()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const resized = await sharp(body).metadata();

  const placeholderBuffer = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: PLACEHOLDER_EDGE, height: PLACEHOLDER_EDGE, fit: 'inside' })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    body,
    extension: 'webp',
    mime: 'image/webp',
    width: resized.width ?? meta.width,
    height: resized.height ?? meta.height,
    size: body.byteLength,
    placeholder: `data:image/webp;base64,${placeholderBuffer.toString('base64')}`,
  };
}
