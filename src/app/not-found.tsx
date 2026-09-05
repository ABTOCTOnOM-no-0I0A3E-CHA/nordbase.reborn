import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-6 text-center">
      <p className="font-display text-aurora text-xs tracking-[0.18em] uppercase">404</p>
      <h1 className="text-3xl font-bold tracking-tight">Такой страницы нет</h1>
      <p className="text-ink-2">
        Возможно, адрес изменился. Загляните на главную — оттуда есть путь во все разделы.
      </p>
      <Link href="/" className="text-aurora hover:text-aurora-hi font-semibold">
        На главную →
      </Link>
    </main>
  );
}
