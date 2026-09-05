import 'server-only';
import { asc, eq, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { db } from '@/db';

/* Перестановка соседей: меняем местами значения sort у текущей строки и той,
   что стоит рядом в нужную сторону. Дырки в нумерации допустимы — важен
   только порядок, поэтому переиндексировать всю таблицу не нужно. */
export async function moveRow(
  table: PgTable,
  idColumn: PgColumn,
  sortColumn: PgColumn,
  id: string,
  direction: 'up' | 'down',
  scope?: SQL,
): Promise<void> {
  const rows = (await db
    .select({ id: idColumn, sort: sortColumn })
    .from(table)
    .where(scope)
    .orderBy(asc(sortColumn))) as { id: string; sort: number }[];

  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) return;

  const target = direction === 'up' ? index - 1 : index + 1;
  const current = rows[index];
  const neighbour = rows[target];
  if (!current || !neighbour) return;

  /* Всё в одной транзакции: частичный сбой оставил бы две строки с одинаковым
     sort, и порядок в списке стал бы недетерминированным. */
  await db.transaction(async (tx) => {
    /* Если sort совпадает (например, всё нулевое после импорта), простой обмен
       ничего не изменит — раскладываем позиции заново по текущему порядку. */
    if (current.sort === neighbour.sort) {
      const reordered = [...rows];
      reordered[index] = neighbour;
      reordered[target] = current;
      for (const [i, row] of reordered.entries()) {
        await tx
          .update(table)
          .set({ [sortColumn.name]: i } as Record<string, number>)
          .where(eq(idColumn, row.id));
      }
      return;
    }

    await tx
      .update(table)
      .set({ [sortColumn.name]: neighbour.sort } as Record<string, number>)
      .where(eq(idColumn, current.id));
    await tx
      .update(table)
      .set({ [sortColumn.name]: current.sort } as Record<string, number>)
      .where(eq(idColumn, neighbour.id));
  });
}
