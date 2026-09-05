/* Отдельно от storage.ts, потому что storage — серверный модуль с node:fs,
   а собрать URL нужно и в клиентских компонентах. */
export function mediaUrl(key: string): string {
  return `/uploads/${key}`;
}
