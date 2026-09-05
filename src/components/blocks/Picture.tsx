import Image from 'next/image';
import { mediaUrl } from '@/lib/media-url';
import type { MediaRecord } from '@/lib/site-data';

/* Заглушка вместо картинки, когда фото ещё не загрузили. Показываем её и в
   админке, и на сайте — так сразу видно, где дырка в контенте. */
function Empty({ className = '', ratio = 'aspect-[4/3]' }: { className?: string; ratio?: string }) {
  return (
    <div
      className={`bg-bg-2 border-line text-ink-3 flex items-center justify-center rounded-[14px] border text-[13px] ${ratio} ${className}`}
    >
      фото не загружено
    </div>
  );
}

export function Picture({
  media,
  className = '',
  sizes = '100vw',
  priority = false,
  ratio,
  fill = false,
}: {
  media: MediaRecord | undefined;
  className?: string;
  sizes?: string;
  priority?: boolean;
  ratio?: string;
  fill?: boolean;
}) {
  if (!media) return <Empty className={className} ratio={ratio} />;

  const common = {
    src: mediaUrl(media.key),
    alt: media.alt,
    sizes,
    priority,
    placeholder: media.blurhash ? ('blur' as const) : ('empty' as const),
    blurDataURL: media.blurhash ?? undefined,
  };

  if (fill) return <Image {...common} fill className={className} />;

  return <Image {...common} width={media.width} height={media.height} className={className} />;
}
