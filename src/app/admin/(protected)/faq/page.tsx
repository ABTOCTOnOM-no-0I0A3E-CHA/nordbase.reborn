import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { faq } from '@/db/schema';
import { AdminHeading } from '@/components/admin/ui';
import { RowsEditor, type Column } from '@/components/admin/RowsEditor';
import { deleteFaq, moveFaq, saveFaq } from '@/lib/admin/catalog-actions';

export const metadata = { title: 'Вопросы' };

const columns: Column[] = [
  { name: 'question', label: 'Вопрос гостя', className: 'md:col-span-2' },
  { name: 'answer', label: 'Ваш ответ', type: 'textarea', className: 'md:col-span-2' },
  { name: 'visible', label: 'Показывать на сайте', type: 'checkbox' },
];

export default async function FaqPage() {
  const rows = await db.select().from(faq).orderBy(asc(faq.sort));

  return (
    <div>
      <AdminHeading
        title="Вопросы и ответы"
        description="Чем больше ответов здесь, тем меньше одинаковых звонков. Появляются на всех страницах, где добавлен блок «Вопросы»."
      />
      <RowsEditor
        icon="faq"
        rows={rows.map((row) => ({
          id: row.id,
          title: row.question,
          note: row.answer.slice(0, 90),
          hidden: !row.visible,
          values: { question: row.question, answer: row.answer, visible: row.visible },
        }))}
        columns={columns}
        save={saveFaq}
        remove={deleteFaq}
        move={moveFaq}
        addLabel="Добавить вопрос"
        emptyText="Вопросов пока нет. Вспомните, что чаще всего спрашивают по телефону, — и запишите сюда."
      />
    </div>
  );
}
