import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { seasons } from '@/db/schema';
import { AdminHeading, EmptyState, LinkButton } from '@/components/admin/ui';
import { EntityList } from '@/components/admin/EntityList';
import { deleteSeason, moveSeason } from '@/lib/admin/content-actions';

export const metadata = { title: 'Сезоны' };

export default async function SeasonsList() {
  const rows = await db.select().from(seasons).orderBy(asc(seasons.sort));

  return (
    <div>
      <AdminHeading
        title="Сезоны Териберки"
        description="Зима, весна, лето, осень. Каждый сезон получает свою страницу и карточку в блоке «Сезоны»."
        action={<LinkButton href="/admin/seasons/new">Добавить сезон</LinkButton>}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="season"
          title="Сезонов пока нет"
          description="Добавьте сезон с фотографией и рассказом — гость выберет, когда ему интереснее приехать."
          action={<LinkButton href="/admin/seasons/new">Добавить сезон</LinkButton>}
        />
      ) : null}
      <EntityList
        rows={rows.map((row) => ({
          id: row.id,
          title: row.title,
          slug: `/teriberka/${row.slug}`,
          status: row.status,
        }))}
        basePath="/admin/seasons"
        icon="season"
        move={moveSeason}
        remove={deleteSeason}
      />
    </div>
  );
}
