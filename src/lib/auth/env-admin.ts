import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { env } from '@/env';

/* Учётка владельца, заданная прямо в .env.

   Так её можно поменять или восстановить без походов в базу: правим две
   строки в файле, перезапускаем контейнер — и вход работает. Пароль из файла
   главнее того, что лежит в базе: иначе после правки .env старый пароль
   продолжал бы пускать внутрь, а это ровно та ситуация, ради которой пароль
   и меняют. */

export function envAdmin(): { email: string; password: string } | null {
  const email = env.ADMIN_EMAIL?.toLowerCase();
  const password = env.ADMIN_PASSWORD;
  /* Короткий пароль в файле — почти наверняка заготовка вроде «changeme»:
     такую учётку не поднимаем вовсе, чтобы она не стала дырой. */
  if (!email || !password || password.length < 8) return null;
  return { email, password };
}

/* Сравнение за одинаковое время: обычное === выходит из цикла на первом
   несовпавшем байте, и по времени ответа можно подбирать пароль посимвольно. */
export function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/* Приводит базу в соответствие с .env и возвращает id учётки. */
export async function ensureEnvAdmin(): Promise<string | null> {
  const admin = envAdmin();
  if (!admin) return null;

  const rows = await db.select().from(users).where(eq(users.email, admin.email)).limit(1);
  const existing = rows[0];

  if (!existing) {
    const [created] = await db
      .insert(users)
      .values({
        email: admin.email,
        passwordHash: await hashPassword(admin.password),
        name: 'Владелец',
        role: 'owner',
      })
      .returning({ id: users.id });
    return created?.id ?? null;
  }

  /* Хеш пересчитываем только когда пароль в файле действительно другой:
     argon2id на 19 МиБ — дорогая операция, и делать её на каждый вход незачем. */
  if (!(await verifyPassword(existing.passwordHash, admin.password))) {
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(admin.password) })
      .where(eq(users.id, existing.id));
  }

  return existing.id;
}
