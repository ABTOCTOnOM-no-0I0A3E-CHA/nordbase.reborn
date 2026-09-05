import 'server-only';
import { getSessionUser, type SessionUser } from './session';

/* Server Action — это публичный HTTP-эндпоинт: проверка в layout его не защищает,
   вызвать действие можно напрямую, минуя страницу. Поэтому каждое действие,
   которое что-то меняет, обязано начинаться с requireUser(). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error('Требуется вход в админку');
  return user;
}

/* Часть операций доступна только владельцу: доступы и настройки сайта. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'owner') throw new Error('Недостаточно прав');
  return user;
}
