import Image from 'next/image';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { media } from '@/db/schema';
import { mediaUrl } from '@/lib/media-url';
import { AdminHeading, ConfirmSubmit, Input, Submit } from '@/components/admin/ui';
import { MediaUpload } from '@/components/admin/MediaUpload';
import { deleteMedia, updateAlt } from '@/lib/admin/media-actions';

export const metadata = { title: 'Медиатека' };

export default async function MediaPage() {
  const rows = await db.select().from(media).orderBy(desc(media.createdAt));

  return (
    <div>
      <AdminHeading
        title="Медиатека"
        description="Все фотографии сайта. При загрузке каждая приводится к WebP и уменьшается до 2560 px по длинной стороне."
      />

      <MediaUpload />

      {rows.length === 0 ? (
        <p className="text-ink-3">Пока пусто. Загрузите первые фотографии.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((item) => (
            <div key={item.id} className="bg-bg-3 border-line overflow-hidden rounded-[14px] border">
              <div className="bg-bg-2 relative aspect-[4/3]">
                <Image
                  src={mediaUrl(item.key)}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 25vw"
                  className="object-cover"
                  placeholder={item.blurhash ? 'blur' : 'empty'}
                  blurDataURL={item.blurhash ?? undefined}
                />
              </div>
              <div className="grid gap-2 p-3">
                <p className="text-ink-3 text-[11.5px]">
                  {item.width}×{item.height} · {Math.round(item.size / 1024)} КБ
                </p>
                <form action={updateAlt} className="flex gap-2">
                  <input type="hidden" name="id" value={item.id} />
                  <Input name="alt" defaultValue={item.alt} placeholder="Что на фото" />
                  <Submit variant="ghost">OK</Submit>
                </form>
                <form action={deleteMedia}>
                  <input type="hidden" name="id" value={item.id} />
                  <ConfirmSubmit message="Удалить фото? Оно пропадёт на всех страницах, где используется.">
                    Удалить
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
