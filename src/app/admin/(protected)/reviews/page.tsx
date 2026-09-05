import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { AdminHeading } from '@/components/admin/ui';
import { RowsEditor, type Column } from '@/components/admin/RowsEditor';
import { deleteReview, moveReview, saveReview } from '@/lib/admin/catalog-actions';

export const metadata = { title: 'Отзывы' };

const columns: Column[] = [
  { name: 'author', label: 'Имя гостя' },
  { name: 'source', label: 'Откуда', placeholder: 'Telegram, Яндекс.Карты' },
  { name: 'text', label: 'Текст отзыва', type: 'textarea', className: 'md:col-span-2' },
  { name: 'rating', label: 'Оценка 1–5', type: 'number' },
  { name: 'visible', label: 'Показывать на сайте', type: 'checkbox' },
];

export default async function ReviewsPage() {
  const rows = await db.select().from(reviews).orderBy(asc(reviews.sort));

  return (
    <div className="max-w-4xl">
      <AdminHeading
        title="Отзывы"
        description="Блок «Отзывы» не появляется на сайте, пока здесь пусто — пустой секции не будет."
      />
      <RowsEditor
        rows={rows.map((row) => ({
          id: row.id,
          values: {
            author: row.author,
            source: row.source,
            text: row.text,
            rating: row.rating,
            visible: row.visible,
          },
        }))}
        columns={columns}
        save={saveReview}
        remove={deleteReview}
        move={moveReview}
        addLabel="Добавить отзыв"
      />
    </div>
  );
}
