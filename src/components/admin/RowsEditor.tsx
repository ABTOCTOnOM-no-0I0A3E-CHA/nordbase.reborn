'use client';

import { useState } from 'react';
import { Input, Submit, Textarea } from './ui';
import { Dropdown } from '@/components/form/Dropdown';
import { NumberField } from '@/components/form/NumberField';
import { ActionForm } from './ActionForm';
import { Icon, type IconName } from './icons';

/* Один редактор на три плоских справочника: цены, вопросы, отзывы.
   Строки свёрнуты и показывают своё содержимое — так список читается как
   список, а не как десять одинаковых форм подряд. Разворачивается по клику,
   каждая строка при этом остаётся отдельной формой и сохраняется отдельно. */

export type Column = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'checkbox' | 'select';
  placeholder?: string;
  className?: string;
  /* Только для type: 'select' — список допустимых значений. */
  options?: { value: string; label: string }[];
};

export type Row = {
  id: string;
  values: Record<string, string | number | boolean | null>;
  /* Что показать в свёрнутом виде: заголовок и пояснение помельче. */
  title: string;
  note?: string;
  hidden?: boolean;
};

type Action = (formData: FormData) => Promise<void>;

function Cell({ column, value }: { column: Column; value: string | number | boolean | null }) {
  if (column.type === 'checkbox') {
    return (
      <label className="text-ink-2 flex cursor-pointer items-center gap-2.5 text-[13.5px]">
        <input
          type="checkbox"
          name={column.name}
          defaultChecked={Boolean(value)}
          className="check"
        />
        {column.label}
      </label>
    );
  }

  if (column.type === 'select') {
    return (
      <Dropdown
        name={column.name}
        options={column.options ?? []}
        defaultValue={value == null ? '' : String(value)}
      />
    );
  }

  if (column.type === 'textarea') {
    return (
      <Textarea
        name={column.name}
        rows={3}
        placeholder={column.placeholder ?? column.label}
        defaultValue={value == null ? '' : String(value)}
      />
    );
  }

  if (column.type === 'number') {
    return (
      <NumberField
        name={column.name}
        defaultValue={value == null ? '' : String(value)}
        placeholder={column.placeholder}
        min={0}
      />
    );
  }

  return (
    <Input
      name={column.name}
      placeholder={column.placeholder ?? column.label}
      defaultValue={value == null ? '' : String(value)}
    />
  );
}

function Fields({
  columns,
  values,
}: {
  columns: Column[];
  values: Record<string, string | number | boolean | null>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {columns.map((column) => (
        <div key={column.name} className={column.className ?? ''}>
          {column.type !== 'checkbox' ? (
            <span className="text-ink mb-1.5 block text-[13px] font-semibold">{column.label}</span>
          ) : null}
          <Cell column={column} value={values[column.name] ?? null} />
        </div>
      ))}
    </div>
  );
}

export function RowsEditor({
  rows,
  columns,
  save,
  remove,
  move,
  addLabel = 'Добавить',
  icon = 'text',
  emptyText,
}: {
  rows: Row[];
  columns: Column[];
  save: Action;
  remove: Action;
  move: Action;
  addLabel?: string;
  icon?: IconName;
  emptyText?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  /* Пустые значения для формы добавления: галочка «показывать» включена. */
  const blank: Record<string, string | number | boolean | null> = {};
  for (const column of columns) blank[column.name] = column.type === 'checkbox' ? true : null;

  return (
    <div className="grid gap-2.5">
      {rows.length === 0 && !adding && emptyText ? (
        <p className="text-ink-3 border-line-2 rounded-[14px] border border-dashed px-5 py-8 text-center text-[13.5px]">
          {emptyText}
        </p>
      ) : null}

      {rows.map((row, index) => {
        const open = openId === row.id;

        return (
          <div
            key={row.id}
            className={`bg-bg-3 min-w-0 overflow-hidden rounded-[14px] border transition ${
              open ? 'border-aurora/40' : 'border-line'
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : row.id)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
              >
                <span
                  className={`flex size-9 flex-none items-center justify-center rounded-[10px] ${
                    open ? 'bg-aurora/15 text-aurora' : 'bg-bg-2 text-ink-3'
                  }`}
                >
                  <Icon name={icon} className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <b
                    className={`block truncate text-[14.5px] font-semibold ${
                      row.hidden ? 'text-ink-3' : ''
                    }`}
                  >
                    {row.title || 'Без названия'}
                  </b>
                  {row.note ? (
                    <span className="text-ink-3 block truncate text-[12.5px]">{row.note}</span>
                  ) : null}
                </span>
              </button>

              {row.hidden ? (
                <span className="text-ink-3 bg-bg-2 flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold">
                  скрыто
                </span>
              ) : null}

              <span className="flex flex-none items-center gap-1">
                <ActionForm action={move}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    disabled={index === 0}
                    aria-label="Выше"
                    title="Выше"
                    className="text-ink-3 hover:bg-bg-2 hover:text-ink flex size-10 flex-none cursor-pointer items-center justify-center rounded-[8px] disabled:opacity-25"
                  >
                    ↑
                  </button>
                </ActionForm>
                <ActionForm action={move}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    disabled={index === rows.length - 1}
                    aria-label="Ниже"
                    title="Ниже"
                    className="text-ink-3 hover:bg-bg-2 hover:text-ink flex size-10 flex-none cursor-pointer items-center justify-center rounded-[8px] disabled:opacity-25"
                  >
                    ↓
                  </button>
                </ActionForm>
              </span>
            </div>

            {open ? (
              <div className="border-line border-t px-4 py-5">
                <ActionForm action={save} success="Сохранено" className="grid gap-4">
                  <input type="hidden" name="id" value={row.id} />
                  <Fields columns={columns} values={row.values} />
                  <div>
                    <Submit>Сохранить</Submit>
                  </div>
                </ActionForm>
                {/* Отдельная форма: вложенные формы браузер не разрешает. */}
                <ActionForm
                  action={remove}
                  success="Запись удалена"
                  confirm="Удалить запись? Это действие нельзя отменить."
                  className="border-line mt-4 border-t pt-4"
                >
                  <input type="hidden" name="id" value={row.id} />
                  <button
                    type="submit"
                    className="border-busy/40 text-busy hover:bg-busy/10 hover:border-busy/70 cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                  >
                    Удалить
                  </button>
                </ActionForm>
              </div>
            ) : null}
          </div>
        );
      })}

      {adding ? (
        <ActionForm
          action={save}
          success="Добавлено"
          className="border-aurora/40 bg-bg-3 grid gap-4 rounded-[14px] border p-4"
        >
          <div className="flex items-center justify-between">
            <b className="text-[14.5px] font-semibold">{addLabel}</b>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-ink-3 hover:text-ink cursor-pointer text-[13px]"
            >
              Отмена
            </button>
          </div>
          <Fields columns={columns} values={blank} />
          <div>
            <Submit>{addLabel}</Submit>
          </div>
        </ActionForm>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="border-line-2 text-ink-2 hover:border-aurora/50 hover:text-ink flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-dashed py-3.5 text-[14px] font-semibold transition"
        >
          <Icon name="plus" className="size-[18px]" />
          {addLabel}
        </button>
      )}
    </div>
  );
}
