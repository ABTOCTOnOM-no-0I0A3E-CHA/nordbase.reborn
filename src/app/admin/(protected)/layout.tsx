import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { requests } from '@/db/schema';
import { destroySession, getSessionUser } from '@/lib/auth/session';
import { Nav } from '@/components/admin/Nav';
import { Icon } from '@/components/admin/icons';
import { AdminShell } from '@/components/admin/Shell';
import { ToastProvider } from '@/components/admin/Toast';
import { Mark } from '@/components/Mark';

/* Проверка здесь, а не в middleware: middleware крутится на edge и не ходит в БД,
   так что там можно проверить только наличие куки, но не её валидность. */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');

  const [counts] = await db
    .select({ fresh: sql<number>`count(*) filter (where ${requests.status} = 'new')::int` })
    .from(requests);

  async function logout() {
    'use server';
    await destroySession();
    redirect('/admin/login');
  }

  return (
    <ToastProvider>
      <AdminShell
        newRequests={counts?.fresh ?? 0}
        sidebar={
          <>
        <Link href="/admin" className="mb-6 flex items-center gap-2.5 px-3">
          <Mark id="nb-side" className="size-7 flex-none" />
          <span className="font-display text-[15px] font-semibold">NORDBASE</span>
        </Link>

        <Nav newRequests={counts?.fresh ?? 0} />

        <div className="border-line mt-auto border-t px-3 pt-4 pb-2">
          <Link
            href="/"
            target="_blank"
            className="text-ink-2 hover:bg-bg-3 hover:text-ink mb-1 flex items-center gap-2.5 rounded-[10px] px-0 py-2 text-[13.5px]"
          >
            <Icon name="external" className="size-[18px]" />
            Открыть сайт
          </Link>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="text-ink block truncate text-[13px] font-semibold">{user.name}</span>
              <span className="text-ink-3 block text-[11.5px]">
                {user.role === 'owner' ? 'владелец' : 'менеджер'}
              </span>
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-ink-3 hover:text-ink cursor-pointer text-[12.5px] whitespace-nowrap"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>
          </>
        }
      >
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
