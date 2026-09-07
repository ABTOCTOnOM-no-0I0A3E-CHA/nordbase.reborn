import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { isUuid } from '@/lib/uuid';

/* Куда ведёт уведомление о заявке.

   Отдельный маршрут, а не прямая ссылка на список, нужен ради одного случая:
   владелец нажал уведомление, а вход уже слетел. Прямая ссылка ушла бы на
   страницу входа, потеряв по дороге, какую заявку он открывал. Здесь адрес
   заявки уезжает в параметр `next` и после входа отрабатывает целиком —
   вместе с якорем, потому что внутри параметра решётка закодирована и
   браузер её не отрезает. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) redirect('/admin/requests');

  const target = `/admin/requests?open=${id}#r-${id}`;
  const user = await getSessionUser();

  if (!user) redirect(`/admin/login?next=${encodeURIComponent(target)}`);
  redirect(target);
}
