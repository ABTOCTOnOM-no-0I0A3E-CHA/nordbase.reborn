import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { requests } from '@/db/schema';

export const metadata = { title: 'Панель' };

export default async function Dashboard() {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      fresh: sql<number>`count(*) filter (where ${requests.status} = 'new')::int`,
    })
    .from(requests);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Панель</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-bg-3 border-line rounded-[16px] border p-6">
          <p className="text-ink-3 mb-1 text-sm">Новых заявок</p>
          <p className="text-ice text-3xl font-bold">{counts?.fresh ?? 0}</p>
        </div>
        <div className="bg-bg-3 border-line rounded-[16px] border p-6">
          <p className="text-ink-3 mb-1 text-sm">Всего заявок</p>
          <p className="text-3xl font-bold">{counts?.total ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
