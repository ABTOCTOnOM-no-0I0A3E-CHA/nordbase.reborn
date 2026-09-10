'use client';

/* Выход стирает офлайн-копию панели.

   Пока владелец работает, страницы занятости и заявок лежат в кеше браузера —
   ради работы без интернета на базе. В них телефоны и имена гостей, поэтому
   при выходе кеш нужно снести: на общем компьютере или потерянном телефоне он
   пережил бы саму сессию. */
export function LogoutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={() => {
        navigator.serviceWorker?.controller?.postMessage('clear-cache');
      }}
    >
      <button
        type="submit"
        className="text-ink-3 hover:text-ink cursor-pointer text-[12.5px] whitespace-nowrap"
      >
        Выйти
      </button>
    </form>
  );
}
