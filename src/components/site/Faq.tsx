import type { FaqRecord } from '@/lib/site-data';

/* Нативный details/summary: раскрытие работает без JS и доступно с клавиатуры. */
export function Faq({ items }: { items: FaqRecord[] }) {
  if (items.length === 0) return null;

  return (
    <div className="max-w-[820px]">
      {items.map((item) => (
        <details key={item.id} className="border-line group border-b">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-[16.5px] font-semibold [&::-webkit-details-marker]:hidden">
            {item.question}
            <span className="text-aurora flex-none transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="text-ink-2 max-w-[66ch] pb-5">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
