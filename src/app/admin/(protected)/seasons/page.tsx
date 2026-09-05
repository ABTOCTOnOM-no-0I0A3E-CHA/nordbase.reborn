import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { seasons } from '@/db/schema';
import { AdminHeading, LinkButton } from '@/components/admin/ui';
import { EntityList } from '@/components/admin/EntityList';
import { deleteSeason, moveSeason } from '@/lib/admin/content-actions';

export const metadata = { title: 'Сезоны' };

export default async function SeasonsList() {
  const rows = await db.select().from(seasons).orderBy(asc(seasons.sort));

  return (
    <div className="max-w-4xl">
      <AdminHeading
        title="Сезоны Териберки"
        description="Попадают в блок «Сезоны» и получают отдельную страницу каждый."
        action={<LinkButton href="/admin/seasons/new">Новый сезон</LinkButton>}
      />
      <EntityList
        rows={rows.map((row) => ({
          id: row.id,
          title: row.title,
          slug: `/teriberka/${row.slug}`,
          status: row.status,
        }))}
        basePath="/admin/seasons"
        move={moveSeason}
        remove={deleteSeason}
      />
    </div>
  );
}
