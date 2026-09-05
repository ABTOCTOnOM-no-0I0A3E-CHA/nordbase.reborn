import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { env } from '@/env';

const DURATION_MS = 30 * 24 * 60 * 60 * 1000; /* 30 дней */
const REFRESH_BEFORE_MS = 15 * 24 * 60 * 60 * 1000; /* продлеваем, когда осталось меньше 15 */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager';
};

/* В куке — сырой токен, в БД — его SHA-256. Дамп базы не даёт войти. */
function digest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + DURATION_MS);

  await db.insert(sessions).values({ id: digest(token), userId, expiresAt });

  const store = await cookies();
  store.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const id = digest(token);
  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }

  /* Скользящее продление: активный пользователь не разлогинивается на 31-й день. */
  if (row.expiresAt.getTime() - Date.now() < REFRESH_BEFORE_MS) {
    const expiresAt = new Date(Date.now() + DURATION_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, row.sessionId));
  }

  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, digest(token)));
  store.delete(env.SESSION_COOKIE_NAME);
}

/* Сравнение секретов постоянного времени — для мест, где сравниваем токены вручную. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
