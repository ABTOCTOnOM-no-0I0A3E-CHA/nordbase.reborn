/* Разметка под .sky из globals.css. Шесть лент — шесть пустых элементов,
   вся геометрия и анимация живут в CSS. */
export function Aurora() {
  return (
    <div className="sky" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}
