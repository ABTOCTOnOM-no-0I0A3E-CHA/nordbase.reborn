import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { prices } from '@/db/schema';
import { AdminHeading } from '@/components/admin/ui';
import { RowsEditor, type Column } from '@/components/admin/RowsEditor';
import { deletePrice, movePrice, savePrice } from '@/lib/admin/catalog-actions';

export const metadata = { title: 'Цены' };

const columns: Column[] = [
  { name: 'title', label: 'Название', placeholder: 'Проживание' },
  { name: 'amount', label: 'Сумма, ₽', type: 'number', placeholder: 'пусто = по запросу' },
  { name: 'unit', label: 'Единица', placeholder: 'с человека в сутки' },
  { name: 'group', label: 'Группа', placeholder: 'base или extra' },
  { name: 'note', label: 'Пояснение', type: 'textarea', className: 'md:col-span-2' },
  { name: 'visible', label: 'Показывать на сайте', type: 'checkbox' },
];

export default async function PricesPage() {
  const rows = await db.select().from(prices).orderBy(asc(prices.sort));

  return (
    <div className="max-w-4xl">
      <AdminHeading
        title="Цены"
        description="Оставьте сумму пустой — на сайте вместо цифры появится «по запросу». Группа base попадает в основной прайс, extra — в дополнительный."
      />
      <RowsEditor
        rows={rows.map((row) => ({
          id: row.id,
          values: {
            title: row.title,
            amount: row.amount,
            unit: row.unit,
            group: row.group,
            note: row.note,
            visible: row.visible,
          },
        }))}
        columns={columns}
        save={savePrice}
        remove={deletePrice}
        move={movePrice}
        addLabel="Добавить строку"
      />
    </div>
  );
}
