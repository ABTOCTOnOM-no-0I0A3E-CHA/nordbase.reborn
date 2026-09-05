import { AdminHeading, Field, Input, Panel, Select, Textarea } from '@/components/admin/ui';
import { savePage } from '@/lib/admin/content-actions';
import { EntityForm } from '@/components/admin/EntityForm';

export const metadata = { title: 'Новая страница' };

export default function NewPage() {
  return (
    <div className="max-w-2xl">
      <AdminHeading
        title="Новая страница"
        description="Создайте страницу, а блоки добавите на следующем шаге."
      />
      <Panel>
        <EntityForm action={savePage} submitLabel="Создать">
          <input type="hidden" name="id" value="" />
          <div className="sm:col-span-2"><Field label="Название">
            <Input name="title" required maxLength={200} placeholder="Отзывы гостей" />
          </Field></div>
          <Field
            label="Адрес на сайте"
            hint="Без ведущего слэша. Пустое поле — главная страница. Пример: otzyvy или rybachiy/banya"
          >
            <Input name="slug" placeholder="otzyvy" pattern="[a-z0-9\-/]*" maxLength={160} />
          </Field>
          <Field label="Заголовок для поиска" hint="Если пусто — берётся название.">
            <Input name="seoTitle" />
          </Field>
          <Field label="Описание для поиска">
            <Textarea name="seoDescription" rows={2} />
          </Field>
          <Field label="Состояние">
            <Select name="status" defaultValue="draft">
              <option value="draft">Черновик</option>
              <option value="published">Опубликована</option>
            </Select>
          </Field>
        </EntityForm>
      </Panel>
    </div>
  );
}
