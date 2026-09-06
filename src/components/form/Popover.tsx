'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode, RefObject } from 'react';

/* Слой, который всплывает поверх страницы.

   Раньше список и календарь были обычными absolute-блоками внутри поля.
   Любой родитель с overflow: hidden — карточка блока, строка справочника,
   панель — обрезал их: половина списка исчезала, и казалось, что вёрстка
   поехала. Поэтому рисуем содержимое порталом в body с position: fixed:
   тогда ни один родитель до него не дотянется.

   Координаты пересчитываем при открытии, при прокрутке и при смене размера
   окна. Если снизу не хватает места — разворачиваемся вверх. */

type Placement = { left: number; top: number; width: number; flipped: boolean };

export function Popover({
  anchorRef,
  open,
  onClose,
  children,
  matchWidth = true,
  width,
  maxHeight = 280,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /* Совпадать по ширине с полем — так ведут себя выпадающие списки. */
  matchWidth?: boolean;
  width?: number;
  maxHeight?: number;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Placement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Позицию считаем до отрисовки, иначе слой мигает в левом верхнем углу. */
  useLayoutEffect(() => {
    if (!open) {
      setPlace(null);
      return;
    }

    const measure = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom;
      const flipped = below < maxHeight + 16 && rect.top > below;
      /* На телефоне поле бывает узким (половина строки в сетке), а список в
         такой ширине нечитаем. Поэтому не уже 260px — и никогда шире экрана. */
      const room = window.innerWidth - 16;
      const layerWidth = Math.min(
        Math.max(width ?? (matchWidth ? rect.width : 290), Math.min(260, room)),
        room,
      );

      /* Не даём слою вылезти за правый край окна. */
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - layerWidth - 8);

      setPlace({
        left,
        top: flipped ? rect.top - 6 : rect.bottom + 6,
        width: layerWidth,
        flipped,
      });
    };

    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, anchorRef, matchWidth, width, maxHeight]);

  /* Закрываем по клику мимо и по Esc. Клик по самому полю обрабатывает поле. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: Event) => {
      const target = event.target as Node;
      if (layerRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    /* На тач-экране mousedown приходит только после отпускания пальца, из-за
       чего список закрывается с заметной задержкой. */
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted || !open || !place) return null;

  return createPortal(
    <div
      ref={layerRef}
      style={{
        left: place.left,
        top: place.top,
        width: place.width,
        maxHeight,
        transform: place.flipped ? 'translateY(-100%)' : undefined,
      }}
      className="border-line-2 bg-bg-3 fixed z-[100] overflow-y-auto rounded-[10px] border p-1 shadow-[0_16px_40px_rgb(0_0_0/0.55)]"
    >
      {children}
    </div>,
    document.body,
  );
}
