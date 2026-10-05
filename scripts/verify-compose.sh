#!/usr/bin/env bash
set -euo pipefail

compose=(docker compose --env-file .env)

cleanup() {
  "${compose[@]}" down --remove-orphans
}
trap cleanup EXIT

"${compose[@]}" config --quiet
"${compose[@]}" up --build --detach

for _ in $(seq 1 30); do
  if curl --fail --silent --show-error http://localhost:8080/actuator/health | grep -q '"status":"UP"'; then
    break
  fi
  sleep 2
done

curl --fail --silent --show-error http://localhost:8080/actuator/health | grep -q '"status":"UP"'
curl --fail --silent --show-error http://localhost:8080/h2-console/ | grep -q 'H2 Console'
curl --fail --silent --show-error http://localhost:4200/ | grep -q '<app-root></app-root>'
curl --fail --silent --show-error \
  --header 'Content-Type: application/json' \
  --data '{"username":"admin","password":"admin123"}' \
  http://localhost:4200/api/auth/login | grep -q '"token"'
