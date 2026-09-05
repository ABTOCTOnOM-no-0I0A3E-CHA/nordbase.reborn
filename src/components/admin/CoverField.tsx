'use client';

import { useState } from 'react';
import { MediaPicker, type MediaOption } from './MediaPicker';

/* Обёртка вокруг MediaPicker для обычных форм: выбранный id уезжает на сервер
   скрытым полем, поэтому форма остаётся серверной и работает через Server Action. */
export function CoverField({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string | null;
  options: MediaOption[];
}) {
  const [value, setValue] = useState<string | null>(defaultValue);

  return (
    <>
      <input type="hidden" name={name} value={value ?? ''} />
      <MediaPicker value={value} options={options} onChange={setValue} />
    </>
  );
}
