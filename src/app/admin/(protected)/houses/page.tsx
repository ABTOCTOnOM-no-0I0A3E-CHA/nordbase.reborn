import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { houses } from '@/db/schema';
import { AdminHeading, LinkButton } from '@/components/admin/ui';
import { EntityList } from '@/components/admin/EntityList';
import { deleteHouse, moveHouse } from '@/lib/admin/content-actions';

export const metadata = { title: 'Домики' };

export default async function HousesList() {
  const rows = await db.select().from(houses).orderBy(asc(houses.sort));

  return (
    <div className="max-w-4xl">
      <AdminHeading
        title="Домики"
        description="Порядок здесь определяет порядок на сайте. Черновики на сайте не видны."
        action={<LinkButton href="/admin/houses/new">Новый домик</LinkButton>}
      />
      <EntityList
        rows={rows.map((row) => ({
          id: row.id,
          title: row.title,
          slug: `/rybachiy/doma/${row.slug}`,
          status: row.status,
          note: `до ${row.capacity} гостей`,
        }))}
        basePath="/admin/houses"
        move={moveHouse}
        remove={deleteHouse}
      />
    </div>
  );
}
