/* Свой небольшой набор иконок вместо библиотеки: их полтора десятка,
   а любая библиотека — это лишняя зависимость и лишние килобайты в бандле.
   Все нарисованы в сетке 24×24 одной толщиной штриха, поэтому в ряду
   выглядят как один набор. */

export type IconName =
  | 'dashboard'
  | 'requests'
  | 'calendar'
  | 'pages'
  | 'house'
  | 'tour'
  | 'season'
  | 'media'
  | 'price'
  | 'faq'
  | 'review'
  | 'settings'
  | 'plug'
  | 'plus'
  | 'external'
  | 'text'
  | 'layout'
  | 'grid'
  | 'form'
  | 'map'
  | 'number';

const paths: Record<IconName, string> = {
  dashboard: 'M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z',
  requests: 'M4 6h16v12H4zM4 7l8 6 8-6',
  calendar: 'M4 7h16v13H4zM4 11h16M9 4v4M15 4v4',
  pages: 'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6',
  house: 'M4 11 12 4l8 7M6 10v10h12V10',
  tour: 'M6 20V9a3 3 0 0 1 6 0v6a3 3 0 0 0 6 0V4M6 20a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM18 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z',
  season: 'M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9',
  media: 'M4 5h16v14H4zM4 16l4-4 3 3 4-5 5 6',
  price: 'M4 6h16M4 12h16M4 18h10',
  faq: 'M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.8M12 17h.01M4 4h16v16H4z',
  review: 'm12 4 2.4 5 5.6.7-4 3.9 1 5.4-5-2.7-5 2.7 1-5.4-4-3.9 5.6-.7z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3H9.8l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4.4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z',
  plug: 'M9 3v6M15 3v6M6 9h12v3a6 6 0 0 1-12 0zM12 18v3',
  plus: 'M12 5v14M5 12h14',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  text: 'M4 6h16M4 12h16M4 18h9',
  layout: 'M4 4h16v16H4zM4 9h16M9 9v11',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  form: 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h4',
  map: 'm9 4 6 3 5-3v13l-5 3-6-3-5 3V7zM9 4v13M15 7v13',
  number: 'M6 9h3v11H6zM10.5 4h3v16h-3zM15 13h3v7h-3z',
};

export function Icon({
  name,
  className = 'size-[18px]',
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-none ${className}`}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
