import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { AdminHeading, Panel } from '@/components/admin/ui';
import { RowsEditor, type Column } from '@/components/admin/RowsEditor';
import { deleteReview, moveReview, saveReview } from '@/lib/admin/catalog-actions';

export const metadata = { title: 'Отзывы' };

const columns: Column[] = [
  { name: 'author', label: 'Имя гостя' },
  { name: 'source', label: 'Откуда отзыв', placeholder: 'Telegram, Яндекс.Карты, WhatsApp' },
  { name: 'text', label: 'Текст отзыва', type: 'textarea', className: 'md:col-span-2' },
  { name: 'rating', label: 'Оценка от 1 до 5', type: 'number' },
  { name: 'visible', label: 'Показывать на сайте', type: 'checkbox' },
];

export default async function ReviewsPage() {
  const rows = await db.select().from(reviews).orderBy(asc(reviews.sort));

  return (
    <div>
      <AdminHeading
        title="Отзывы"
        description="Отзывы, которые вы переносите сюда руками — например, из переписки с гостем."
      />

      <Panel className="mb-5">
        <p className="text-ink-2 text-[13.5px] leading-[1.5]">
          Пока отзывов здесь нет, блок «Отзывы» на сайте показывает только кнопку на Яндекс.Карты.
          Ссылку на карточку базы можно поменять в разделе «Настройки».
        </p>
      </Panel>

      <RowsEditor
        icon="review"
        rows={rows.map((row) => ({
          id: row.id,
          title: row.author,
          note: `${row.rating ? `${row.rating}/5 · ` : ''}${row.text.slice(0, 80)}`,
          hidden: !row.visible,
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
        emptyText="Своих отзывов пока нет — на сайте показывается ссылка на Яндекс.Карты."
      />
    </div>
  );
}
