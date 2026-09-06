import Link from 'next/link';
import type { ReactNode } from 'react';
import { isMarkup, sanitizeRichText } from '@/lib/rich-text';

export function Wrap({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-5 sm:px-[30px] ${className}`}>{children}</div>;
}

export function Section({
  children,
  alt = false,
  id,
}: {
  children: ReactNode;
  alt?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`py-16 sm:py-24 ${alt ? 'bg-bg-2' : 'bg-bg'}`}>
      <Wrap>{children}</Wrap>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-display text-aurora flex items-center gap-3 text-[11.5px] tracking-[0.18em] uppercase">
      <span className="bg-aurora inline-block h-px w-[34px] flex-none" />
      {children}
    </p>
  );
}

/* Общая шапка секции: надпись-эйбрау, заголовок, подзаголовок.
   Пустые поля просто не рендерятся — клиент заполняет что хочет. */
export function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
  if (!eyebrow && !title && !subtitle) return null;
  return (
    <div className="mb-10 sm:mb-12">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      {title ? (
        <h2 className="mt-4 max-w-[20ch] text-[clamp(26px,3.4vw,40px)] leading-[1.1] font-bold tracking-[-0.025em] text-balance">
          {title}
        </h2>
      ) : null}
      {subtitle ? <p className="text-ink-2 mt-4 max-w-[52ch]">{subtitle}</p> : null}
    </div>
  );
}

type BtnProps = {
  href: string;
  children: ReactNode;
  variant?: 'solid' | 'outline';
};

export function Btn({ href, children, variant = 'solid' }: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-aurora';
  const look =
    variant === 'solid'
      ? 'bg-aurora text-aurora-ink hover:bg-aurora-hi'
      : 'border border-line-2 bg-white/6 text-ink backdrop-blur-[6px] hover:border-ink-2 hover:bg-white/12';

  const external = href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:');
  if (external) {
    return (
      <a href={href} className={`${base} ${look}`} rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={`${base} ${look}`}>
      {children}
    </Link>
  );
}

/* Текст из админки. Новые блоки хранят разметку из редактора, старые —
   обычный текст с переносами строк; поддерживаем оба вида.
   Разметку чистим ещё раз при выводе: в базу может писать не только форма. */
export function Prose({ text, className = '' }: { text: string; className?: string }) {
  if (!text.trim()) return null;

  if (isMarkup(text)) {
    const html = sanitizeRichText(text);
    if (!html) return null;
    return (
      <div
        className={`prose-site text-ink-2 space-y-4 ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const paragraphs = text
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className={`text-ink-2 space-y-4 ${className}`}>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-bg-3 border-line rounded-[16px] border ${className}`}>{children}</div>
  );
}
