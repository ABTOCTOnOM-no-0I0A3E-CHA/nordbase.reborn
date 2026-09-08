#!/bin/sh
# Автодеплой: подтягивает main и пересобирает приложение, если что-то приехало.
# Запускается таймером systemd раз в минуту (см. scripts/deploy.systemd).
#
# Модель «сервер сам ходит за изменениями», а не webhook: наружу у машины
# открыт только SSH, репозиторий публичный, а значит не нужны ни принимающий
# эндпоинт, ни ключ развёртывания в секретах GitHub — нечему утекать.

# Журнал:  journalctl -u nordbase-deploy -n 50 --no-pager
# Вручную: sudo systemctl start nordbase-deploy

set -eu

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S')  $1"
}

git fetch --quiet origin main

local_rev=$(git rev-parse HEAD)
remote_rev=$(git rev-parse origin/main)

if [ "$local_rev" = "$remote_rev" ]; then
  exit 0
fi

log "новая версия: $(git log --oneline -1 origin/main)"

migrations_before=$(ls drizzle/*.sql 2>/dev/null | wc -l)

# Только перемотка вперёд. Если на сервере оказались свои правки, деплой
# обязан упасть и оставить их в покое, а не затирать историю.
git merge --ff-only origin/main

# Схему базы автоматически не трогаем: неудачная миграция на боевых данных
# хуже, чем задержка. Но молчать об этом нельзя — код уже уехал и может
# обращаться к таблице, которой ещё нет.
migrations_after=$(ls drizzle/*.sql 2>/dev/null | wc -l)
if [ "$migrations_after" -gt "$migrations_before" ]; then
  log "ВНИМАНИЕ: приехали новые миграции ($migrations_before -> $migrations_after). Применить вручную:"
  log "  docker compose -f docker-compose.prod.yml exec -T db psql -U nordbase -d nordbase -f - < drizzle/<файл>.sql"
fi

$COMPOSE build app
$COMPOSE up -d

# Между остановкой старого контейнера и готовностью нового прокси получает
# 502. Ждём, пока приложение ответит, и только потом считаем деплой удачным —
# иначе сломанная версия молча остаётся висеть до следующего пуша.
ready=""
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:3000/; then
    ready="да"
    break
  fi
  sleep 2
done

if [ -z "$ready" ]; then
  log "ОШИБКА: приложение не отвечает после обновления. Логи: docker compose -f docker-compose.prod.yml logs app"
  exit 1
fi

# Кеш сборки съедает около четырёх гигабайт, а свободного места здесь единицы:
# держим его в пределах двух гигабайт, иначе через пару деплоев сборка встанет
# без места. Слои прошлых образов не нужны — работает только текущий.
docker image prune -af >/dev/null
docker builder prune -f --keep-storage 2GB >/dev/null 2>&1 ||
  docker builder prune -f --filter until=24h >/dev/null

log "развёрнуто: $(git rev-parse --short HEAD)"
