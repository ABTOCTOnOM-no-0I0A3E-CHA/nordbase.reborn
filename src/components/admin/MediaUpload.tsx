'use client';

import { useFormAction } from '@/lib/use-form-action';
import { useToast } from './Toast';
import { uploadMedia, type UploadState } from '@/lib/admin/media-actions';
import { Field, Input, Submit } from './ui';
import { FileField } from '@/components/form/FileField';

const initial: UploadState = { uploaded: 0, errors: [] };

export function MediaUpload() {
  const toast = useToast();
  const { state, pending, onSubmit } = useFormAction(uploadMedia, initial, {
    onSuccess: (next) => {
      if (next.uploaded > 0) toast.ok(`Загружено фотографий: ${next.uploaded}`);
      if (next.errors.length > 0) toast.error(next.errors.join('; '));
    },
  });

  return (
    <form
      onSubmit={onSubmit}
      className="border-line-2 mb-7 grid gap-4 rounded-[14px] border border-dashed p-5 md:grid-cols-[1fr_1fr_auto] md:items-end"
    >
      <div className="md:col-span-2">
        <span className="text-ink mb-1.5 block text-[13px] font-semibold">Файлы</span>
        <FileField
          name="files"
          accept="image/*"
          multiple
          required
          hint="JPEG, PNG, WebP, HEIC. До 20 МБ каждый; за один раз не больше 30 МБ суммарно — тяжёлые снимки грузите партиями."
        />
      </div>

      <Field label="Описание для всех" hint="Что на фото — нужно для поиска и незрячих посетителей.">
        <Input name="alt" placeholder="Эко-дом №1, вид снаружи" />
      </Field>

      <div className="pb-1">
        <Submit pending={pending}>Загрузить</Submit>
      </div>

      {state.uploaded > 0 ? (
        <p className="text-aurora text-[13px] md:col-span-3">Загружено файлов: {state.uploaded}</p>
      ) : null}
      {state.errors.length > 0 ? (
        <ul className="text-busy text-[13px] md:col-span-3">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
