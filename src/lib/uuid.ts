const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Идентификаторы приходят из адреса страницы. Без проверки Postgres отвечает
   «invalid input syntax for type uuid», и вместо «страница не найдена»
   пользователь видит экран ошибки. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
