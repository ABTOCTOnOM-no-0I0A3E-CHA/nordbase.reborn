/* Знак базы: «С» — «Север». Круг — полярная ночь, градиент по нему повторяет
   сияние из хиро (aurora → ice → violet), а сама буква вырезана цветом фона.

   Буква нарисована дугой, а не текстом: шрифт в фавиконе подставить нечем, и
   на 16 пикселях контур надёжнее любой гарнитуры. Разрыв дуги смотрит вправо,
   как у обычной «С».

   Цвета заданы числами намеренно — тот же знак лежит отдельным файлом в
   app/icon.svg, где переменных темы нет, и оба должны совпадать. */

export function Mark({ className = '', id = 'nb-mark' }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5fa88b" />
          <stop offset="0.55" stopColor="#7fa9c4" />
          <stop offset="1" stopColor="#8b84b5" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${id})`} />
      <circle
        cx="32"
        cy="32"
        r="16.5"
        fill="none"
        stroke="#081119"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeDasharray="82 21.7"
        transform="rotate(37.5 32 32)"
      />
    </svg>
  );
}
