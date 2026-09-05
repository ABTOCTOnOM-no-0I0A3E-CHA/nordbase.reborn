import Link from 'next/link';
import { redirect } from 'next/navigation';
import { destroySession, getSessionUser } from '@/lib/auth/session';
import { Nav } from '@/components/admin/Nav';

/* Проверка здесь, а не в middleware: middleware крутится на edge и не ходит в БД,
   так что там можно проверить только наличие куки, но не её валидность. */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');

  async function logout() {
    'use server';
    await destroySession();
    redirect('/admin/login');
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="border-line bg-bg-2 border-b px-4 py-6 lg:min-h-dvh lg:border-r lg:border-b-0">
        <Link href="/admin" className="font-display mb-7 block px-3 text-[15px] font-semibold">
          NORDBASE
        </Link>
        <Nav />
        <div className="border-line text-ink-3 mt-8 border-t px-3 pt-5 text-[13px]">
          <p className="text-ink-2">{user.name}</p>
          <p className="mb-3">{user.role === 'owner' ? 'владелец' : 'менеджер'}</p>
          <Link href="/" target="_blank" className="hover:text-ink block">
            Открыть сайт ↗
          </Link>
          <form action={logout}>
            <button type="submit" className="hover:text-ink mt-1 cursor-pointer">
              Выйти
            </button>
          </form>
        </div>
      </aside>

      <main className="px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
