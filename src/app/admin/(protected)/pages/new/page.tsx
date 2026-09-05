import { AdminHeading, Field, Input, Panel, Select, Submit, Textarea } from '@/components/admin/ui';
import { savePage } from '@/lib/admin/content-actions';

export const metadata = { title: 'Новая страница' };

export default function NewPage() {
  return (
    <div className="max-w-2xl">
      <AdminHeading
        title="Новая страница"
        description="Создайте страницу, а блоки добавите на следующем шаге."
      />
      <Panel>
        <form action={savePage} className="grid gap-4">
          <input type="hidden" name="id" value="" />
          <Field label="Название">
            <Input name="title" required placeholder="Отзывы гостей" />
          </Field>
          <Field
            label="Адрес на сайте"
            hint="Без ведущего слэша. Пустое поле — главная страница. Пример: otzyvy или rybachiy/banya"
          >
            <Input name="slug" placeholder="otzyvy" />
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
          <div>
            <Submit>Создать</Submit>
          </div>
        </form>
      </Panel>
    </div>
  );
}
