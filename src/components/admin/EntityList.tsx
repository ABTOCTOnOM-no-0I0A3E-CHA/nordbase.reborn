import Link from 'next/link';
import { ActionForm } from './ActionForm';
import { Icon, type IconName } from './icons';

/* Общий список для домиков, туров и сезонов: у всех троих одинаковая механика —
   порядок, состояние публикации и переход в редактор. */

export type EntityRow = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  note?: string;
};

export function EntityList({
  rows,
  basePath,
  icon,
  move,
  remove,
  removeWarning,
}: {
  rows: EntityRow[];
  basePath: string;
  icon: IconName;
  move: (formData: FormData) => Promise<void>;
  remove?: (formData: FormData) => Promise<void>;
  /* Что ещё пропадёт вместе с записью — владелец должен знать до нажатия. */
  removeWarning?: string;
}) {
  return (
    <div className="grid gap-2.5">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="bg-bg-3 border-line hover:border-line-2 flex flex-wrap items-center gap-3 rounded-[14px] border px-4 py-3 transition"
        >
          <span className="bg-bg-2 text-ink-3 flex size-9 flex-none items-center justify-center rounded-[10px]">
            <Icon name={icon} className="size-[18px]" />
          </span>

          <Link href={`${basePath}/${row.id}`} className="min-w-0 flex-1">
            <b className="hover:text-aurora block truncate text-[15px] font-semibold transition">
              {row.title}
            </b>
            <span className="text-ink-3 block truncate text-[12.5px]">
              {row.note ? `${row.note} · ` : ''}
              {row.slug}
            </span>
          </Link>

          <span
            className={`flex-none rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
              row.status === 'published' ? 'bg-ok/15 text-ok' : 'bg-amber/15 text-amber'
            }`}
          >
            {row.status === 'published' ? 'на сайте' : 'скрыт'}
          </span>

          <span className="flex flex-none items-center gap-1">
            <ActionForm action={move}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="direction" value="up" />
              <button
                type="submit"
                aria-label="Выше"
                title="Выше"
                disabled={index === 0}
                className="text-ink-3 hover:bg-bg-2 hover:text-ink cursor-pointer rounded-[8px] px-2 py-1.5 disabled:opacity-25"
              >
                ↑
              </button>
            </ActionForm>
            <ActionForm action={move}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="direction" value="down" />
              <button
                type="submit"
                aria-label="Ниже"
                title="Ниже"
                disabled={index === rows.length - 1}
                className="text-ink-3 hover:bg-bg-2 hover:text-ink cursor-pointer rounded-[8px] px-2 py-1.5 disabled:opacity-25"
              >
                ↓
              </button>
            </ActionForm>

            {remove ? (
              <ActionForm
                action={remove}
                success={`«${row.title}» удалён`}
                confirm={`Удалить «${row.title}»? ${removeWarning ?? ''} Это действие нельзя отменить.`}
              >
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  className="border-busy/40 text-busy hover:bg-busy/10 hover:border-busy/70 cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                >
                  Удалить
                </button>
              </ActionForm>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
