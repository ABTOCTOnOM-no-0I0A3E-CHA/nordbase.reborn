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

# Только перемотка вперёд. Если на сервере оказались свои правки, деплой
# обязан упасть и оставить их в покое, а не затирать историю.
git merge --ff-only origin/main

$COMPOSE build app
$COMPOSE up -d

# Кеш сборки съедает по паре гигабайт на образ, а диск здесь 15 ГБ.
docker image prune -f >/dev/null
docker builder prune -f --filter until=72h >/dev/null

log "развёрнуто: $(git rev-parse --short HEAD)"
