'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { allow, clientKey } from '@/lib/throttle';

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

/* Куда вернуть после входа. Берём только свои внутренние адреса панели:
   «//чужой-сайт» и «https://…» браузер считает внешними, и открытый редирект
   со страницы входа — классический способ увести владельца на подделку. */
function safeNext(value: unknown): string {
  const path = typeof value === 'string' ? value : '';
  if (!path.startsWith('/admin/') || path.startsWith('//')) return '/admin';
  return path;
}

export type LoginState = { error?: string };

/* Хеш несуществующего пароля. Считаем его, когда пользователя нет, чтобы
   время ответа не выдавало, зарегистрирована почта или нет. */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZS1zdGF0aWMtc2FsdA$1sVJHVJ7iMYIBoRDy0oQ0y3wPmZ0oNIrXK5Rr7C2xhE';

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  /* Перебор пароля дорог не только для атакующего: каждая попытка — это
     argon2id на 19 МиБ, то есть параллельный перебор ещё и кладёт сервер. */
  if (!allow(await clientKey('login'), 10, 15 * 60 * 1000)) {
    return { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' };
  }

  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) return { error: 'Проверьте почту и пароль' };

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  const user = rows[0];
  const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, parsed.data.password);

  /* Одна формулировка на оба случая — не подсказываем, что почта существует. */
  if (!user || !ok) return { error: 'Неверная почта или пароль' };

  await createSession(user.id);
  /* Пришли по уведомлению о заявке — возвращаемся к ней, а не на главную. */
  redirect(safeNext(formData.get('next')));
}
