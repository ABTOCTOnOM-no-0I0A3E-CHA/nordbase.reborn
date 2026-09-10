/* Уведомления и офлайн-режим панели. Работает в фоне, даже когда панель
   закрыта, — поэтому живёт отдельным файлом в public, а не внутри приложения.

   На базе нет интернета. Владелица уезжает туда с гостями и там же должна
   видеть, кто и когда заезжает, — иначе календарь бесполезен ровно в тот
   момент, когда он нужен. Поэтому страницы панели кешируются: сеть всегда в
   приоритете, а без неё отдаётся последняя удачная копия.

   Кешируем только страницы панели и только успешные ответы. Публичный сайт не
   трогаем: гостю нужен свежий календарь, а не вчерашний. */

const CACHE = 'nordbase-admin-v1';

self.addEventListener('activate', (event) => {
  /* Старые версии кеша удаляем сразу: иначе после обновления панель может
     показать разметку от предыдущей сборки. */
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/admin')) return;
  /* Страницу входа кешировать незачем — она и так лёгкая, а её копия в кеше
     только путала бы при истёкшей сессии. */
  if (url.pathname.startsWith('/admin/login')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        /* Ничего не нашли — честно говорим, что связи нет, вместо пустого
           экрана браузера. */
        return new Response(
          '<!doctype html><meta charset="utf-8"><title>Нет связи</title>' +
            '<body style="font-family:system-ui;background:#081119;color:#e6eef2;padding:40px">' +
            '<h1 style="font-size:20px">Нет связи</h1>' +
            '<p style="color:#9db1bd">Этот раздел ещё не открывался при интернете, поэтому показать нечего. ' +
            'Занятость и заявки, которые вы уже смотрели, доступны и без сети.</p>',
          { headers: { 'content-type': 'text/html; charset=utf-8' }, status: 503 },
        );
      }),
  );
});

/* Выход из панели стирает кеш: на общем или потерянном телефоне в нём
   остались бы телефоны гостей. */
self.addEventListener('message', (event) => {
  if (event.data === 'clear-cache') event.waitUntil(caches.delete(CACHE));
});

self.addEventListener('push', (event) => {
  let data = { title: 'Новая заявка', body: '', url: '/admin/requests' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* прилетело не JSON — покажем заголовок по умолчанию */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      /* Вибрация и звук по умолчанию: заявка — то, ради чего стоит отвлечься. */
      vibrate: [80, 40, 80],
      tag: 'nordbase-request',
      renotify: true,
      data: { url: data.url },
    }),
  );
});

/* Нажатие на уведомление открывает заявки. Если панель уже открыта в другой
   вкладке — переводим фокус туда, а не плодим копии. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/admin/requests';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
