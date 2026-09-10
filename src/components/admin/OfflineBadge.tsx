'use client';

import { useEffect, useState } from 'react';

/* Панель работает и без интернета — но владелец должен знать, что смотрит
   сохранённую копию, а не текущее состояние.

   На базе связи нет: она уезжает туда с гостями и открывает занятость уже
   офлайн. Без этой полоски легко принять вчерашние данные за сегодняшние и
   посадить в домик вторую группу.

   Здесь же регистрируется фоновый обработчик: без него ничего не кешируется,
   а раньше он появлялся только при включении уведомлений. */
export function OfflineBadge() {
  const [offline, setOffline] = useState(false);
  const [since, setSince] = useState<string | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* Регистрация не удалась — панель просто останется без офлайна. */
      });
    }

    const online = () => setOffline(false);
    const gone = () => {
      setOffline(true);
      setSince(
        new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      );
    };

    setOffline(!navigator.onLine);
    window.addEventListener('online', online);
    window.addEventListener('offline', gone);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', gone);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="border-amber/40 bg-amber/15 text-amber sticky top-0 z-30 border-b px-4 py-2.5 text-[13px] font-semibold">
      Нет связи{since ? ` с ${since}` : ''} — показаны сохранённые данные. Новые заявки и правки
      появятся, когда интернет вернётся.
    </div>
  );
}
