import 'server-only';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { settings } from '@/db/schema';

/* Настройки занятости лежат отдельной строкой, а не внутри «site»: форма
   настроек сайта пишет свой объект целиком, и любое поле, добавленное сюда,
   стёрлось бы при первом же сохранении контактов. */

export type OccupancySettings = {
  /* Сколько человек база увозит в тур за один день. Вездеход берёт четверых;
     ноль — не считать людей вовсе, только объекты размещения. */
  seats: number;
  /* Доля предоплаты, после которой даты закрепляются за гостем. */
  prepayPercent: number;
  /* Питание за человека в день. Показывается в расчёте стоимости заявки. */
  mealsPrice: number;
};

export const DEFAULT_OCCUPANCY: OccupancySettings = {
  seats: 4,
  prepayPercent: 10,
  mealsPrice: 2500,
};

const schema = z.object({
  seats: z.coerce.number().int().min(0).max(200).catch(DEFAULT_OCCUPANCY.seats),
  prepayPercent: z.coerce.number().int().min(0).max(100).catch(DEFAULT_OCCUPANCY.prepayPercent),
  mealsPrice: z.coerce.number().int().min(0).max(100000).catch(DEFAULT_OCCUPANCY.mealsPrice),
});

export async function loadOccupancySettings(): Promise<OccupancySettings> {
  const rows = await db.select().from(settings).where(eq(settings.key, 'occupancy')).limit(1);
  const stored = rows[0]?.value;
  if (!stored || typeof stored !== 'object') return DEFAULT_OCCUPANCY;

  const parsed = schema.safeParse({ ...DEFAULT_OCCUPANCY, ...stored });
  return parsed.success ? parsed.data : DEFAULT_OCCUPANCY;
}
