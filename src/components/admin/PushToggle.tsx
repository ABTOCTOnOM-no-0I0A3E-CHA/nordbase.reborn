'use client';

import { useEffect, useState } from 'react';
import { useToast } from './Toast';
import { getPushKey, subscribePush, unsubscribePush } from '@/lib/admin/push-actions';

/* Кнопка «получать заявки на этот телефон».

   Живёт в браузере, потому что подписка выдаётся именно им: сервер узнаёт об
   устройстве только после того, как владелец разрешил уведомления. */

/* Ключ приходит строкой в base64url, а браузеру нужен массив байтов.
   Буфер создаём явно: тип подписки требует именно ArrayBuffer. */
function toBytes(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buffer;
}

/* Понятное имя устройства, чтобы владелец узнал его в списке. */
function deviceName(): string {
  const ua = navigator.userAgent;
  const platform = /iPhone|iPad/.test(ua)
    ? 'iPhone'
    : /Android/.test(ua)
      ? 'Android'
      : /Macintosh/.test(ua)
        ? 'Mac'
        : /Windows/.test(ua)
          ? 'Windows'
          : 'устройство';
  const browser = /YaBrowser/.test(ua)
    ? 'Яндекс.Браузер'
    : /Chrome/.test(ua)
      ? 'Chrome'
      : /Safari/.test(ua)
        ? 'Safari'
        : /Firefox/.test(ua)
          ? 'Firefox'
          : '';
  return browser ? `${platform}, ${browser}` : platform;
}

export function PushToggle() {
  const toast = useToast();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  /* iPhone присылает уведомления только приложению с главного экрана. */
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (!ok) return;

    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setNeedsInstall(isIos && !standalone);

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setEnabled(Boolean(sub)))
      .catch(() => setEnabled(false));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Уведомления запрещены. Разрешите их для сайта в настройках браузера');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const key = await getPushKey();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toBytes(key),
      });

      const result = await subscribePush(subscription.toJSON(), deviceName());
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setEnabled(true);
      toast.ok('Уведомления включены на этом устройстве');
    } catch (cause) {
      console.error(cause);
      toast.error('Не удалось включить уведомления');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEnabled(false);
      toast.ok('Уведомления на этом устройстве выключены');
    } catch {
      toast.error('Не удалось выключить');
    } finally {
      setBusy(false);
    }
  }

  if (supported === null) return null;

  if (!supported) {
    return (
      <p className="text-ink-3 text-[13.5px]">
        Этот браузер не умеет присылать уведомления. Откройте панель в Chrome, Safari или
        Яндекс.Браузере.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void (enabled ? disable() : enable())}
          className={`cursor-pointer rounded-full px-5 py-2.5 text-[14px] font-semibold transition disabled:opacity-50 ${
            enabled
              ? 'border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink border'
              : 'bg-aurora text-aurora-ink hover:bg-aurora-hi'
          }`}
        >
          {busy
            ? 'Секунду…'
            : enabled
              ? 'Выключить на этом устройстве'
              : 'Получать заявки на это устройство'}
        </button>

        {enabled ? (
          <span className="text-ok text-[13px] font-semibold">включено</span>
        ) : null}
      </div>

      {needsInstall ? (
        <p className="text-amber bg-amber/10 mt-3 rounded-[10px] px-4 py-3 text-[13px] leading-[1.5]">
          На iPhone уведомления приходят только приложению с главного экрана. Нажмите «Поделиться»
          → «На экран „Домой“», откройте панель с появившейся иконки и включите уведомления там.
        </p>
      ) : null}
    </div>
  );
}
