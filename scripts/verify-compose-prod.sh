#!/usr/bin/env bash
set -euo pipefail

compose=(docker compose --env-file .env -f compose.yaml -f compose.prod.yaml)

cleanup() {
  "${compose[@]}" down --remove-orphans
}
trap cleanup EXIT

wait_for_health() {
  for _ in $(seq 1 45); do
    if curl --fail --silent --show-error http://localhost:8080/actuator/health | grep -q '"status":"UP"'; then
      return
    fi
    sleep 2
  done
  return 1
}

"${compose[@]}" config --quiet
"${compose[@]}" up --build --detach
wait_for_health

if curl --fail --silent --show-error http://localhost:8080/h2-console/; then
  echo "H2 console must not be available in prod" >&2
  exit 1
fi

token=$(curl --fail --silent --show-error \
  --header 'Content-Type: application/json' \
  --data "{\"username\":\"${BOOTSTRAP_ADMIN_USERNAME}\",\"password\":\"${BOOTSTRAP_ADMIN_PASSWORD}\"}" \
  http://localhost:4200/api/auth/login | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
test -n "$token"

product_name="Persistent product $(date +%s)"
curl --fail --silent --show-error \
  --header 'Content-Type: application/json' \
  --header "Authorization: Bearer $token" \
  --data "{\"name\":\"${product_name}\",\"description\":\"Compose persistence check\",\"price\":42.00,\"quantity\":3}" \
  http://localhost:4200/api/products | grep -q "${product_name}"

"${compose[@]}" restart backend
wait_for_health
curl --fail --silent --show-error \
  --header "Authorization: Bearer $token" \
  http://localhost:4200/api/products | grep -q "${product_name}"
