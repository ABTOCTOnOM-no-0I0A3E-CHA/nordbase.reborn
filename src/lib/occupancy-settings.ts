import 'server-only';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { settings } from '@/db/schema';

/* Настройки занятости лежат отдельной строкой, а не внутри «site»: форма
   настроек сайта пишет свой объект целиком, и любое поле, добавленное сюда,
   стёрлось бы при первом же сохранении контактов. */

export type OccupancySettings = {
  /* Сколько человек база готова завезти на одну дату. Вездеход берёт восемь за
     поездку; если рейсов два — владелец ставит шестнадцать. Ноль — не считать
     людей вовсе, только домики. */
  seats: number;
};

export const DEFAULT_OCCUPANCY: OccupancySettings = { seats: 8 };

const schema = z.object({
  seats: z.coerce.number().int().min(0).max(200).catch(DEFAULT_OCCUPANCY.seats),
});

export async function loadOccupancySettings(): Promise<OccupancySettings> {
  const rows = await db.select().from(settings).where(eq(settings.key, 'occupancy')).limit(1);
  const stored = rows[0]?.value;
  if (!stored || typeof stored !== 'object') return DEFAULT_OCCUPANCY;

  const parsed = schema.safeParse({ ...DEFAULT_OCCUPANCY, ...stored });
  return parsed.success ? parsed.data : DEFAULT_OCCUPANCY;
}
