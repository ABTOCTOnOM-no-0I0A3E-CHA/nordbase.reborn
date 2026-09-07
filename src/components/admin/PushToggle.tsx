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

/* Состояние решается в таком порядке не случайно. В обычном Safari на iPhone
   PushManager вообще отсутствует — если сначала спрашивать про поддержку,
   владелец увидит «браузер не умеет» ровно там, где на самом деле нужно
   сказать «добавьте на главный экран». */
type State = 'loading' | 'needs-install' | 'ios-old' | 'unsupported' | 'ready';

export function PushToggle() {
  const toast = useToast();
  const [state, setState] = useState<State>('loading');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    /* iPad с iPadOS притворяется Mac‑ом, отличаем по сенсорному экрану. */
    const isIos =
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    const hasApi =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

    if (isIos && !standalone) {
      setState('needs-install');
      return;
    }
    if (!hasApi) {
      setState(isIos ? 'ios-old' : 'unsupported');
      return;
    }

    setState('ready');
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

  if (state === 'loading') return null;

  if (state === 'needs-install') {
    return (
      <div className="border-amber/40 bg-amber/10 rounded-[12px] border px-4 py-3.5">
        <b className="text-amber mb-1.5 block text-[14px]">
          Сначала добавьте панель на главный экран
        </b>
        <ol className="text-ink-2 grid list-decimal gap-1 pl-5 text-[13.5px] leading-[1.5]">
          <li>Нажмите «Поделиться» — квадрат со стрелкой внизу экрана.</li>
          <li>Выберите «На экран „Домой“».</li>
          <li>Откройте панель с появившейся иконки и вернитесь сюда.</li>
        </ol>
        <p className="text-ink-3 mt-2 text-[12.5px] leading-[1.45]">
          Так требует сам iPhone: уведомления он отдаёт только приложению с главного экрана, а не
          вкладке браузера.
        </p>
      </div>
    );
  }

  if (state === 'ios-old') {
    return (
      <p className="text-ink-3 text-[13.5px] leading-[1.5]">
        Панель открыта с главного экрана, но уведомления появились только в iOS 16.4. Обновите
        систему — или получайте заявки в Telegram и ВКонтакте, они работают на любом телефоне.
      </p>
    );
  }

  if (state === 'unsupported') {
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

    </div>
  );
}
