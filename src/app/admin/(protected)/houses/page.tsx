import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { houses } from '@/db/schema';
import { AdminHeading, EmptyState, LinkButton } from '@/components/admin/ui';
import { EntityList } from '@/components/admin/EntityList';
import { deleteHouse, moveHouse } from '@/lib/admin/content-actions';

export const metadata = { title: 'Домики' };

export default async function HousesList() {
  const rows = await db.select().from(houses).orderBy(asc(houses.sort));

  return (
    <div>
      <AdminHeading
        title="Домики"
        description="Карточки домиков на сайте. Порядок здесь — порядок на сайте; скрытые гость не увидит."
        action={<LinkButton href="/admin/houses/new">Добавить домик</LinkButton>}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="house"
          title="Домиков пока нет"
          description="Заведите домик: название, вместимость, цену и фотографии. После этого он появится на сайте."
          action={<LinkButton href="/admin/houses/new">Добавить домик</LinkButton>}
        />
      ) : null}
      <EntityList
        rows={rows.map((row) => ({
          id: row.id,
          title: row.title,
          slug: `/rybachiy/doma/${row.slug}`,
          status: row.status,
          note: `до ${row.capacity} гостей`,
        }))}
        basePath="/admin/houses"
        icon="house"
        move={moveHouse}
        remove={deleteHouse}
        removeWarning="Вместе с домиком удалятся все его брони и занятые даты."
      />
    </div>
  );
}
