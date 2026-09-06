'use client';

import { useState, useTransition } from 'react';
import { Input } from './ui';
import { useToast } from './Toast';

export type ProgramDay = { title: string; stops: { title: string; isFinish: boolean }[] };

/* Программа тура: дни и точки маршрута внутри дня. Отправляется одной кнопкой
   целиком, как и блоки, — так владелец может переставить несколько точек
   и сохранить один раз. */
export function ProgramEditor({
  initial,
  save,
}: {
  initial: ProgramDay[];
  save: (json: string) => Promise<void>;
}) {
  const [days, setDays] = useState<ProgramDay[]>(initial);
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchDay = (index: number, patch: Partial<ProgramDay>) =>
    setDays((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)));

  const patchStop = (dayIndex: number, stopIndex: number, title: string) =>
    patchDay(dayIndex, {
      stops: (days[dayIndex]?.stops ?? []).map((stop, i) =>
        i === stopIndex ? { ...stop, title } : stop,
      ),
    });

  const moveStop = (dayIndex: number, from: number, to: number) => {
    const stops = [...(days[dayIndex]?.stops ?? [])];
    const a = stops[from];
    const b = stops[to];
    if (!a || !b) return;
    stops[from] = b;
    stops[to] = a;
    patchDay(dayIndex, { stops });
  };

  return (
    <div className="grid gap-4">
      {days.map((day, dayIndex) => (
        <div key={dayIndex} className="bg-bg-3 border-line rounded-[14px] border p-4">
          <div className="mb-3 flex items-center gap-3">
            <Input
              value={day.title}
              placeholder={`День ${dayIndex + 1}`}
              onChange={(e) => patchDay(dayIndex, { title: e.target.value })}
              className="max-w-64"
            />
            <button
              type="button"
              onClick={() => setDays((prev) => prev.filter((_, i) => i !== dayIndex))}
              className="border-busy/50 text-busy hover:bg-busy/10 ml-auto cursor-pointer rounded-full border px-3 py-1.5 text-[12.5px]"
            >
              Удалить день
            </button>
          </div>

          <div className="grid gap-2">
            {day.stops.map((stop, stopIndex) => (
              <div key={stopIndex} className="flex items-center gap-2">
                <Input
                  value={stop.title}
                  placeholder="Точка маршрута"
                  onChange={(e) => patchStop(dayIndex, stopIndex, e.target.value)}
                />
                <label
                  className="text-ink-3 flex flex-none cursor-pointer items-center gap-1.5 text-[12px]"
                  title="Последняя точка дня выделяется на сайте"
                >
                  <input
                    type="checkbox"
                    checked={stop.isFinish}
                    onChange={(e) =>
                      patchDay(dayIndex, {
                        stops: day.stops.map((s, i) =>
                          i === stopIndex ? { ...s, isFinish: e.target.checked } : s,
                        ),
                      })
                    }
                    className="accent-aurora size-3.5"
                  />
                  финиш
                </label>
                <button
                  type="button"
                  aria-label="Выше"
                  disabled={stopIndex === 0}
                  onClick={() => moveStop(dayIndex, stopIndex, stopIndex - 1)}
                  className="text-ink-3 hover:text-ink cursor-pointer px-1 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Ниже"
                  disabled={stopIndex === day.stops.length - 1}
                  onClick={() => moveStop(dayIndex, stopIndex, stopIndex + 1)}
                  className="text-ink-3 hover:text-ink cursor-pointer px-1 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Удалить"
                  onClick={() =>
                    patchDay(dayIndex, { stops: day.stops.filter((_, i) => i !== stopIndex) })
                  }
                  className="text-ink-3 hover:text-busy cursor-pointer px-1"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                patchDay(dayIndex, { stops: [...day.stops, { title: '', isFinish: false }] })
              }
              className="border-line-2 text-ink-2 hover:text-ink cursor-pointer rounded-[10px] border border-dashed py-2 text-[13px]"
            >
              + Точка маршрута
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setDays((prev) => [...prev, { title: '', stops: [] }])}
        className="border-line-2 text-ink hover:border-ink-2 cursor-pointer rounded-[14px] border border-dashed py-3 text-[13.5px] font-semibold"
      >
        + День
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setSaved(false);
            setError(null);
            startTransition(async () => {
              /* Пустые точки не сохраняем: пустая строка в маршруте — это опечатка. */
              const cleaned = days.map((day) => ({
                ...day,
                stops: day.stops.filter((stop) => stop.title.trim() !== ''),
              }));
              try {
                await save(JSON.stringify(cleaned));
                setSaved(true);
                toast.ok('Программа тура сохранена');
              } catch (cause) {
                const message =
                  cause instanceof Error && cause.message
                    ? cause.message
                    : 'Не удалось сохранить программу.';
                setError(message);
                toast.error(message);
              }
            });
          }}
          className="bg-aurora text-aurora-ink hover:bg-aurora-hi cursor-pointer rounded-full px-5 py-2.5 text-[14px] font-semibold disabled:opacity-60"
        >
          {pending ? 'Сохраняем…' : 'Сохранить программу'}
        </button>
        {saved && !pending ? <span className="text-aurora text-[13.5px]">Сохранено</span> : null}
        {error ? <span className="text-busy text-[13.5px]">{error}</span> : null}
      </div>
    </div>
  );
}
