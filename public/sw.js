/* Обработчик уведомлений. Работает в фоне, даже когда панель закрыта —
   поэтому живёт отдельным файлом в public, а не внутри приложения.

   Ничего не кеширует намеренно: панель должна показывать текущие заявки,
   а не то, что успело осесть в кеше. */

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
