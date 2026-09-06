import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { houses, requests, tours } from '@/db/schema';
import { getSessionUser } from '@/lib/auth/session';

/* Выгрузка всех заявок в таблицу — то самое «дублирование заявок» из КП,
   только без Google-таблицы: файл открывается в Excel и в Google Sheets,
   и не требует ни аккаунта, ни доступа к чужому сервису. */

const STATUS: Record<string, string> = {
  new: 'новая',
  in_work: 'в работе',
  confirmed: 'подтверждена',
  cancelled: 'отменена',
};

/* Телефоны и числа законно начинаются с «+» или «−» — их не трогаем. */
const PLAIN_NUMBER = /^[+-]?[\d\s()+-]+$/;

function cell(value: string | number | boolean | null): string {
  if (value === null) return '';
  const text = typeof value === 'boolean' ? (value ? 'да' : 'нет') : String(value);

  /* Формулы в ячейках — известный способ атаки на того, кто откроет файл:
     гасим их апострофом. Исключение — обычные номера, иначе каждый телефон
     в выгрузке приезжал бы с лишним апострофом. */
  const dangerous = /^[=@\t\r]/.test(text) || (/^[+-]/.test(text) && !PLAIN_NUMBER.test(text));

  return `"${(dangerous ? `'${text}` : text).replaceAll('"', '""')}"`;
}

function formatDate(value: string | null): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

export async function GET(): Promise<Response> {
  /* Маршрут не под гвардом layout — проверяем доступ сами. */
  const user = await getSessionUser();
  if (!user) return new Response('Требуется вход', { status: 401 });

  const rows = await db
    .select({ request: requests, houseTitle: houses.title, tourTitle: tours.title })
    .from(requests)
    .leftJoin(houses, eq(requests.houseId, houses.id))
    .leftJoin(tours, eq(requests.tourId, tours.id))
    .orderBy(desc(requests.createdAt));

  const header = [
    'Дата заявки',
    'Имя',
    'Телефон',
    'Направление',
    'Тур',
    'Домик',
    'Заезд',
    'Выезд',
    'Гостей',
    'Питание',
    'Баня',
    'Комментарий',
    'Статус',
    'Согласие получено',
  ];

  const lines = [header.map(cell).join(';')];

  for (const { request, houseTitle, tourTitle } of rows) {
    lines.push(
      [
        request.createdAt.toLocaleString('ru-RU'),
        request.name,
        request.phone,
        request.direction,
        tourTitle ?? '',
        houseTitle ?? '',
        formatDate(request.dateFrom),
        formatDate(request.dateTo),
        request.guests,
        request.meals,
        request.banya,
        request.comment,
        STATUS[request.status] ?? request.status,
        request.consentAt.toLocaleString('ru-RU'),
      ]
        .map(cell)
        .join(';'),
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  /* BOM обязателен: без него Excel открывает файл в системной кодировке
     и вместо кириллицы показывает кракозябры. Разделитель — точка с запятой:
     с запятой Excel в русской локали кладёт всю строку в одну ячейку. */
  return new Response(`﻿${lines.join('\r\n')}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="nordbase-zayavki-${today}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
