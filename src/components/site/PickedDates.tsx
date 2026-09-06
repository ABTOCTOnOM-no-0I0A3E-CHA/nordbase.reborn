'use client';

import { createContext, useContext, useMemo, useState } from 'react';

/* Календарь занятости и форма заявки — разные блоки страницы, и владелец
   ставит их куда хочет. Общее у них одно: выбранные гостем даты. Держим их
   здесь, в провайдере вокруг всего сайта, чтобы блоки не знали друг о друге.

   Провайдера может и не быть (форма живёт и на страницах без календаря) —
   тогда работают пустые значения по умолчанию, и ничего не ломается. */

export type PickedRange = { from: string; to: string };

type Value = {
  range: PickedRange | null;
  setRange: (range: PickedRange | null) => void;
};

const PickedDatesContext = createContext<Value>({ range: null, setRange: () => {} });

export function PickedDatesProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<PickedRange | null>(null);
  const value = useMemo(() => ({ range, setRange }), [range]);

  return <PickedDatesContext.Provider value={value}>{children}</PickedDatesContext.Provider>;
}

export function usePickedDates(): Value {
  return useContext(PickedDatesContext);
}
