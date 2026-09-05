-- Две пересекающиеся брони на один домик — это ошибка данных, а не редкий случай.
-- Проверка в коде остаётся ради понятного сообщения, но последнее слово за БД:
-- она защищает и от гонки двух менеджеров, и от правки таблицы руками.
--
-- Интервал полуоткрытый '[)': день выезда свободен, в него заезжает следующий гость.
-- Отменённые брони из проверки исключены.

CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "house_id" WITH =,
    daterange("date_from", "date_to", '[)') WITH &&
  )
  WHERE ("status" <> 'cancelled');--> statement-breakpoint

-- Выезд обязан быть позже заезда, иначе daterange пустой и ничего не защищает.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_dates_ordered" CHECK ("date_to" > "date_from");
