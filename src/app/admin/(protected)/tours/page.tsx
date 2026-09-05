import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { tours } from '@/db/schema';
import { AdminHeading, LinkButton } from '@/components/admin/ui';
import { EntityList } from '@/components/admin/EntityList';
import { deleteTour, moveTour } from '@/lib/admin/content-actions';

export const metadata = { title: 'Туры' };

export default async function ToursList() {
  const rows = await db.select().from(tours).orderBy(asc(tours.sort));

  return (
    <div className="max-w-4xl">
      <AdminHeading
        title="Туры"
        description="Программа по дням редактируется внутри тура."
        action={<LinkButton href="/admin/tours/new">Новый тур</LinkButton>}
      />
      <EntityList
        rows={rows.map((row) => ({
          id: row.id,
          title: row.title,
          slug: `/rybachiy/tury/${row.slug}`,
          status: row.status,
          note: `${row.days} дн.`,
        }))}
        basePath="/admin/tours"
        move={moveTour}
        remove={deleteTour}
      />
    </div>
  );
}
