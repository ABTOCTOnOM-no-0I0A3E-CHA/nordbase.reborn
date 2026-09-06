import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { tours } from '@/db/schema';
import { AdminHeading, EmptyState, LinkButton } from '@/components/admin/ui';
import { EntityList } from '@/components/admin/EntityList';
import { deleteTour, moveTour } from '@/lib/admin/content-actions';

export const metadata = { title: 'Туры' };

export default async function ToursList() {
  const rows = await db.select().from(tours).orderBy(asc(tours.sort));

  return (
    <div>
      <AdminHeading
        title="Туры"
        description="Маршруты по полуострову. Программу по дням задаёте внутри тура."
        action={<LinkButton href="/admin/tours/new">Добавить тур</LinkButton>}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="tour"
          title="Туров пока нет"
          description="Опишите маршрут: сколько дней, что входит и куда едем в каждый день."
          action={<LinkButton href="/admin/tours/new">Добавить тур</LinkButton>}
        />
      ) : null}
      <EntityList
        rows={rows.map((row) => ({
          id: row.id,
          title: row.title,
          slug: `/rybachiy/tury/${row.slug}`,
          status: row.status,
          note: `${row.days} дн.`,
        }))}
        basePath="/admin/tours"
        icon="tour"
        move={moveTour}
        remove={deleteTour}
      />
    </div>
  );
}
