import Link from 'next/link';
import { ConfirmSubmit } from './ui';

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
  move,
  remove,
  removeWarning,
}: {
  rows: EntityRow[];
  basePath: string;
  move: (formData: FormData) => Promise<void>;
  remove?: (formData: FormData) => Promise<void>;
  /* Что ещё пропадёт вместе с записью — владелец должен знать до нажатия. */
  removeWarning?: string;
}) {
  return (
    <div className="grid gap-2">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="bg-bg-3 border-line flex flex-wrap items-center gap-3 rounded-[12px] border px-4 py-3"
        >
          <Link href={`${basePath}/${row.id}`} className="hover:text-aurora text-[15px] font-semibold">
            {row.title}
          </Link>
          <code className="text-ink-3 text-[12.5px]">{row.slug}</code>
          {row.note ? <span className="text-ink-3 text-[12.5px]">{row.note}</span> : null}

          <span
            className={`ml-auto rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
              row.status === 'published' ? 'bg-ok/15 text-ok' : 'bg-amber/15 text-amber'
            }`}
          >
            {row.status === 'published' ? 'на сайте' : 'черновик'}
          </span>

          <form action={move}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              aria-label="Выше"
              disabled={index === 0}
              className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-full border px-2.5 py-1 text-[12px] disabled:opacity-30"
            >
              ↑
            </button>
          </form>
          <form action={move}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              aria-label="Ниже"
              disabled={index === rows.length - 1}
              className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-full border px-2.5 py-1 text-[12px] disabled:opacity-30"
            >
              ↓
            </button>
          </form>

          {remove ? (
            <form action={remove}>
              <input type="hidden" name="id" value={row.id} />
              <ConfirmSubmit
                message={`Удалить «${row.title}»? ${removeWarning ?? ''} Это действие нельзя отменить.`}
              >
                Удалить
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>
      ))}
    </div>
  );
}
