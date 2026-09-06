import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { prices } from '@/db/schema';
import { AdminHeading } from '@/components/admin/ui';
import { RowsEditor, type Column } from '@/components/admin/RowsEditor';
import { deletePrice, movePrice, savePrice } from '@/lib/admin/catalog-actions';

export const metadata = { title: 'Цены' };

const columns: Column[] = [
  { name: 'title', label: 'Что оплачивается', placeholder: 'Проживание' },
  { name: 'amount', label: 'Сумма, ₽', type: 'number', placeholder: 'можно оставить пустой' },
  {
    name: 'unit',
    label: 'За что',
    placeholder: 'с человека в сутки · или «входит в тур», если суммы нет',
  },
  {
    name: 'group',
    label: 'Где показывать',
    type: 'select',
    options: [
      { value: 'base', label: 'Основной прайс' },
      { value: 'extra', label: 'Дополнительно' },
    ],
  },
  { name: 'note', label: 'Пояснение', type: 'textarea', className: 'md:col-span-2' },
  { name: 'visible', label: 'Показывать на сайте', type: 'checkbox' },
];

export default async function PricesPage() {
  const rows = await db.select().from(prices).orderBy(asc(prices.sort));

  return (
    <div>
      <AdminHeading
        title="Цены"
        description="То, что гость видит в разделе «Цены» на сайте. Порядок строк здесь — порядок на сайте."
      />
      <RowsEditor
        icon="price"
        rows={rows.map((row) => ({
          id: row.id,
          /* В свёрнутом виде — как на сайте: название и цена справа. */
          title: row.title,
          note: `${row.amount === null ? row.unit || 'по запросу' : `${row.amount.toLocaleString('ru-RU')} ₽ ${row.unit}`}${
            row.group === 'extra' ? ' · дополнительно' : ''
          }`,
          hidden: !row.visible,
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
        addLabel="Добавить строку в прайс"
        emptyText="Пока ни одной цены. Гость увидит пустой раздел — добавьте хотя бы проживание."
      />
    </div>
  );
}
