'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/* Всплывающие подтверждения. Раньше сохранение отзывалось только надписью
   рядом с кнопкой — на длинной форме её просто не видно, и владелец не
   понимал, сохранилось или нет. Теперь сообщение появляется поверх страницы
   в одном и том же месте и само уходит. */

type Kind = 'ok' | 'error';
type Item = { id: number; kind: Kind; text: string };

const ToastContext = createContext<((kind: Kind, text: string) => void) | null>(null);

export function useToast() {
  const push = useContext(ToastContext);
  return {
    ok: (text: string) => push?.('ok', text),
    error: (text: string) => push?.('error', text),
  };
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);

  const push = useCallback((kind: Kind, text: string) => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, kind, text }]);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((item) => (
          <Toast
            key={item.id}
            item={item}
            onDone={() => setItems((prev) => prev.filter((row) => row.id !== item.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDone }: { item: Item; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    /* Ошибку держим дольше: её нужно успеть прочитать, а не просто заметить. */
    const life = item.kind === 'error' ? 6000 : 3000;
    const hide = setTimeout(() => setLeaving(true), life);
    const remove = setTimeout(onDone, life + 250);
    return () => {
      clearTimeout(hide);
      clearTimeout(remove);
    };
  }, [item.kind, onDone]);

  return (
    <div
      role="status"
      className={`pointer-events-auto flex max-w-[min(92vw,460px)] items-start gap-3 rounded-[12px] border px-4 py-3 text-[14px] shadow-[0_14px_36px_rgb(0_0_0/0.5)] transition-all duration-200 ${
        leaving ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
      } ${
        item.kind === 'ok'
          ? 'border-ok/40 bg-bg-3 text-ink'
          : 'border-busy/50 bg-bg-3 text-ink'
      }`}
    >
      <span
        className={`mt-0.5 flex size-5 flex-none items-center justify-center rounded-full text-[12px] font-bold ${
          item.kind === 'ok' ? 'bg-ok/20 text-ok' : 'bg-busy/20 text-busy'
        }`}
      >
        {item.kind === 'ok' ? '✓' : '!'}
      </span>
      <span className="leading-[1.45]">{item.text}</span>
      <button
        type="button"
        onClick={() => setLeaving(true)}
        aria-label="Закрыть"
        className="text-ink-3 hover:text-ink -mt-0.5 ml-1 cursor-pointer text-[16px] leading-none"
      >
        ×
      </button>
    </div>
  );
}
