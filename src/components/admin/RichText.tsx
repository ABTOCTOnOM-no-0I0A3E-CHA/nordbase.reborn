'use client';

import { useEffect, useRef, useState } from 'react';

/* Редактор текста с форматированием.

   Панель появляется только когда что-то выделено — она не занимает место
   и не пугает владельца рядом рабочих кнопок, пока он просто печатает.

   execCommand помечен устаревшим, но замены с той же поддержкой во всех
   браузерах до сих пор нет, а альтернатива — тащить ProseMirror ради
   пяти кнопок. Результат чистится по белому списку на сервере. */

type Command = { label: string; title: string; run: () => void; style?: string };

export function RichText({
  value,
  onChange,
  placeholder = 'Введите текст…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selecting, setSelecting] = useState(false);

  /* Значение подставляем снаружи только когда поле не в фокусе: иначе
     каждое нажатие клавиши сбрасывало бы каретку в начало. */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor && editor.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  /* Панель показываем, пока выделение живёт внутри этого редактора. */
  useEffect(() => {
    const onSelectionChange = () => {
      const selection = window.getSelection();
      setSelecting(
        Boolean(
          selection &&
            selection.rangeCount > 0 &&
            !selection.isCollapsed &&
            editorRef.current?.contains(selection.anchorNode),
        ),
      );
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  function exec(command: string, argument?: string) {
    document.execCommand(command, false, argument);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  function addLink() {
    const href = window.prompt('Адрес ссылки', 'https://');
    if (!href) return;
    /* Схему проверяем сразу: чистка на сервере такую ссылку выбросит молча,
       и владелец не поймёт, куда делась. */
    if (!/^(https?:\/\/|mailto:|tel:|\/)/i.test(href)) {
      window.alert('Ссылка должна начинаться с https://, mailto:, tel: или /');
      return;
    }
    exec('createLink', href);
  }

  const commands: Command[] = [
    { label: 'Ж', title: 'Полужирный', run: () => exec('bold'), style: 'font-bold' },
    { label: 'К', title: 'Курсив', run: () => exec('italic'), style: 'italic' },
    { label: 'П', title: 'Подчёркнутый', run: () => exec('underline'), style: 'underline' },
    { label: 'З', title: 'Зачёркнутый', run: () => exec('strikeThrough'), style: 'line-through' },
    { label: '•', title: 'Маркированный список', run: () => exec('insertUnorderedList') },
    { label: '1.', title: 'Нумерованный список', run: () => exec('insertOrderedList') },
    { label: '🔗', title: 'Ссылка', run: addLink },
    { label: '✕', title: 'Убрать форматирование', run: () => exec('removeFormat') },
  ];

  return (
    <div className="relative">
      {selecting ? (
        <div className="border-line-2 bg-bg-4 absolute -top-11 left-0 z-20 flex overflow-hidden rounded-[10px] border shadow-[0_10px_24px_rgb(0_0_0/0.45)]">
          {commands.map((command) => (
            <button
              key={command.title}
              type="button"
              title={command.title}
              /* preventDefault на mousedown: без него нажатие снимает
                 выделение раньше, чем команда успевает примениться. */
              onMouseDown={(event) => event.preventDefault()}
              onClick={command.run}
              className={`text-ink-2 hover:bg-bg-2 hover:text-ink min-w-9 cursor-pointer px-2.5 py-2 text-[13px] ${command.style ?? ''}`}
            >
              {command.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        /* Вставляем только текст: иначе из Word приезжают чужие шрифты,
           цвета и таблицы, которые потом всё равно вырежет чистка. */
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
        className="rich border-line-2 bg-bg-2 text-ink focus:outline-aurora min-h-[120px] rounded-[10px] border px-3.5 py-2.5 text-[14.5px] leading-[1.55] focus:border-transparent focus:outline-2"
      />
      <p className="text-ink-3 mt-1.5 text-[12px]">
        Выделите текст мышкой — появится панель: жирный, курсив, списки, ссылка.
      </p>
    </div>
  );
}
