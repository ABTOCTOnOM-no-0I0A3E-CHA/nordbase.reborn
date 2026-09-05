'use client';

import { ConfirmSubmit, Input, Submit, Textarea } from './ui';

/* Один редактор на три плоских справочника: цены, вопросы, отзывы.
   Каждая строка — отдельная форма, поэтому всё работает без клиентского
   состояния и переживает перезагрузку страницы на середине правки. */

export type Column = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'checkbox';
  placeholder?: string;
  className?: string;
};

export type Row = { id: string; values: Record<string, string | number | boolean | null> };

type Action = (formData: FormData) => Promise<void>;

function Cell({ column, value }: { column: Column; value: string | number | boolean | null }) {
  if (column.type === 'checkbox') {
    return (
      <label className="text-ink-2 flex items-center gap-2 text-[13px] whitespace-nowrap">
        <input
          type="checkbox"
          name={column.name}
          defaultChecked={Boolean(value)}
          className="accent-aurora size-4"
        />
        {column.label}
      </label>
    );
  }

  if (column.type === 'textarea') {
    return (
      <Textarea
        name={column.name}
        rows={2}
        placeholder={column.placeholder ?? column.label}
        defaultValue={value == null ? '' : String(value)}
      />
    );
  }

  return (
    <Input
      name={column.name}
      type={column.type === 'number' ? 'number' : 'text'}
      placeholder={column.placeholder ?? column.label}
      defaultValue={value == null ? '' : String(value)}
    />
  );
}

export function RowsEditor({
  rows,
  columns,
  save,
  remove,
  move,
  addLabel = 'Добавить',
}: {
  rows: Row[];
  columns: Column[];
  save: Action;
  remove: Action;
  move: Action;
  addLabel?: string;
}) {
  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <div key={row.id} className="bg-bg-3 border-line rounded-[14px] border p-4">
          <form action={save} className="grid gap-3">
            <input type="hidden" name="id" value={row.id} />
            <div className="grid gap-3 md:grid-cols-2">
              {columns.map((column) => (
                <div key={column.name} className={column.className ?? ''}>
                  {column.type !== 'checkbox' ? (
                    <span className="text-ink-3 mb-1.5 block text-[12px] font-semibold">
                      {column.label}
                    </span>
                  ) : null}
                  <Cell column={column} value={row.values[column.name] ?? null} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Submit>Сохранить</Submit>
            </div>
          </form>

          <div className="border-line mt-3 flex items-center gap-2 border-t pt-3">
            <form action={move}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="direction" value="up" />
              <button
                type="submit"
                disabled={index === 0}
                aria-label="Выше"
                className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-full border px-3 py-1.5 text-[12.5px] disabled:opacity-30"
              >
                ↑
              </button>
            </form>
            <form action={move}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="direction" value="down" />
              <button
                type="submit"
                disabled={index === rows.length - 1}
                aria-label="Ниже"
                className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-full border px-3 py-1.5 text-[12.5px] disabled:opacity-30"
              >
                ↓
              </button>
            </form>
            <form action={remove} className="ml-auto">
              <input type="hidden" name="id" value={row.id} />
              <ConfirmSubmit message="Удалить запись? Это действие нельзя отменить.">
                Удалить
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      ))}

      <form action={save} className="border-line-2 grid gap-3 rounded-[14px] border border-dashed p-4">
        <p className="text-ink-3 text-[12px] font-semibold tracking-[0.08em] uppercase">
          {addLabel}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {columns.map((column) => (
            <div key={column.name} className={column.className ?? ''}>
              {column.type !== 'checkbox' ? (
                <span className="text-ink-3 mb-1.5 block text-[12px] font-semibold">
                  {column.label}
                </span>
              ) : null}
              <Cell
                column={column}
                value={column.type === 'checkbox' ? true : null}
              />
            </div>
          ))}
        </div>
        <div>
          <Submit>{addLabel}</Submit>
        </div>
      </form>
    </div>
  );
}
