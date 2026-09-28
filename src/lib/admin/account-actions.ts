'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession, getSessionUser } from '@/lib/auth/session';
import { allow, clientKey } from '@/lib/throttle';

export type AccountState = { error?: string; ok?: string };

const schema = z.object({
  current: z.string().min(1, 'Введите текущий пароль'),
  next: z.string().min(10, 'Новый пароль короче 10 символов'),
  repeat: z.string(),
});

/* Смена пароля своей учётки прямо в панели. Пароль, заведённый при установке,
   обычно проходит через переписку и мессенджеры — значит его знает не только
   владелец, и поменять его нужно без похода на сервер. */
export async function changePassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Сессия истекла — войдите заново' };

  /* Тот же лимит, что и на входе: проверка текущего пароля — это argon2id на
     19 МиБ, и без ограничения форма стала бы обходным путём для перебора. */
  if (!allow(await clientKey('password'), 10, 15 * 60 * 1000)) {
    return { error: 'Слишком много попыток. Попробуйте через 15 минут.' };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Проверьте поля' };
  }

  const { current, next, repeat } = parsed.data;
  if (next !== repeat) return { error: 'Новые пароли не совпадают' };
  if (next === current) return { error: 'Новый пароль совпадает с текущим' };

  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const row = rows[0];
  if (!row || !(await verifyPassword(row.passwordHash, current))) {
    return { error: 'Текущий пароль неверный' };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(users.id, user.id));

  /* Старые входы гасим: пароль меняют как раз тогда, когда его мог увидеть
     кто-то лишний, и оставлять его сессии живыми бессмысленно. Этому браузеру
     сразу выдаём новую — иначе владелец выкинул бы и себя. */
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await createSession(user.id);

  return { ok: 'Пароль изменён. На других устройствах нужно войти заново.' };
}
