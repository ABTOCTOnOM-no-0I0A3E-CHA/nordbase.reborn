import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { destroySession } from '@/lib/auth/session';

/* Проверка здесь, а не в middleware: middleware крутится на edge и не ходит в БД,
   так что там можно было бы проверить только наличие куки, но не её валидность. */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');

  async function logout() {
    'use server';
    await destroySession();
    redirect('/admin/login');
  }

  return (
    <div className="min-h-dvh">
      <header className="border-line bg-bg-2 flex items-center justify-between border-b px-6 py-4">
        <span className="font-display text-sm font-semibold">NORDBASE</span>
        <div className="text-ink-3 flex items-center gap-4 text-sm">
          <span>
            {user.name} · {user.role === 'owner' ? 'владелец' : 'менеджер'}
          </span>
          <form action={logout}>
            <button type="submit" className="hover:text-ink cursor-pointer">
              Выйти
            </button>
          </form>
        </div>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
