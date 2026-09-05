/* Временная заглушка. Публичные страницы переносим из прототипа на шаге 4. */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-4 px-8">
      <p className="font-display text-xs tracking-[0.18em] text-aurora uppercase">
        База отдыха «Север»
      </p>
      <h1 className="text-4xl font-bold tracking-tight">Nordbase</h1>
      <p className="text-ink-2">
        Фундамент проекта поднят. Публичные страницы переносятся из прототипа.
      </p>
      <a href="/admin" className="text-aurora hover:text-aurora-hi w-fit font-semibold">
        Войти в админку →
      </a>
    </main>
  );
}
