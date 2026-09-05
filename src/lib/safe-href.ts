/* Ссылки в блоках и меню вводит владелец через админку. Схемы вроде
   `javascript:` тут не нужны никогда, а вреда от них достаточно, чтобы
   отсекать их на выводе, а не надеяться на дисциплину при вводе. */

const SAFE = /^(?:\/(?!\/)|#|https?:\/\/|tel:|mailto:)/i;

export function safeHref(value: string | undefined | null): string | null {
  const href = (value ?? '').trim();
  if (href === '') return null;
  return SAFE.test(href) ? href : null;
}
