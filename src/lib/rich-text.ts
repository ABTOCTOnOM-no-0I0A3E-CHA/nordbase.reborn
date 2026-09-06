import sanitizeHtml from 'sanitize-html';

/* Текст блоков теперь хранит разметку: жирный, курсив, списки, ссылки.
   Разметку вводит владелец через редактор в админке, но доверять ей нельзя —
   в contentEditable попадает всё, что человек вставит из буфера, вместе со
   стилями, скриптами и чужими атрибутами. Поэтому чистим по белому списку
   при сохранении и ещё раз при выводе: писать в базу может не только форма.

   Свой санитайзер тут писать нельзя — это классическое место, где «почти
   правильная» регулярка оборачивается XSS. */

const options: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  /* javascript: и data: в ссылках отсекаем на уровне схемы. */
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href'],
  transformTags: {
    /* Внешние ссылки открываем в новой вкладке и рвём связь с opener. */
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    /* execCommand в разных браузерах выдаёт то div, то font — приводим к общему. */
    div: 'p',
    font: 'span',
  },
  /* span оставляем только как контейнер без атрибутов: инлайновые стили
     из буфера обмена ломают типографику сайта. */
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
};

export function sanitizeRichText(value: string): string {
  const cleaned = sanitizeHtml(value, options).trim();
  /* Пустой абзац от редактора — это то же самое, что пустое поле. */
  return cleaned === '<p></p>' || cleaned === '<p><br /></p>' || cleaned === '<br />'
    ? ''
    : cleaned;
}

/* Старые блоки хранят обычный текст с переносами строк. Отличаем по наличию
   тегов, чтобы не ломать то, что уже написано. */
export function isMarkup(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}
