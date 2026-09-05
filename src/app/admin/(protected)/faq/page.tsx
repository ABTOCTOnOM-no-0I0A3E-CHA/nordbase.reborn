import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { faq } from '@/db/schema';
import { AdminHeading } from '@/components/admin/ui';
import { RowsEditor, type Column } from '@/components/admin/RowsEditor';
import { deleteFaq, moveFaq, saveFaq } from '@/lib/admin/catalog-actions';

export const metadata = { title: 'Вопросы' };

const columns: Column[] = [
  { name: 'question', label: 'Вопрос', className: 'md:col-span-2' },
  { name: 'answer', label: 'Ответ', type: 'textarea', className: 'md:col-span-2' },
  { name: 'visible', label: 'Показывать на сайте', type: 'checkbox' },
];

export default async function FaqPage() {
  const rows = await db.select().from(faq).orderBy(asc(faq.sort));

  return (
    <div className="max-w-4xl">
      <AdminHeading
        title="Вопросы и ответы"
        description="Попадают в блок «Вопросы» на всех страницах, где он добавлен."
      />
      <RowsEditor
        rows={rows.map((row) => ({
          id: row.id,
          values: { question: row.question, answer: row.answer, visible: row.visible },
        }))}
        columns={columns}
        save={saveFaq}
        remove={deleteFaq}
        move={moveFaq}
        addLabel="Добавить вопрос"
      />
    </div>
  );
}
