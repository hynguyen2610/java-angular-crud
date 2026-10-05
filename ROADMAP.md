# Roadmap

| Phase | Status | Completion evidence | Active work |
|---|---|---|---|
| Product CRUD application | PARTIALLY DONE | Spring API and Angular source are present; additional product behavior remains outside this packaging slice. | [Docker Compose specification](docs/docker-compose.md) |
| Product validation hardening | IN PROGRESS | See [validation specification](docs/product-validation.md) for API, browser UI, browser-to-API, and realtime-scope scenarios. | Extract client validation/error mapping and add API/UI evidence. |
| Reproducible local stack | DONE | `docker compose config`, both Docker image builds, and the Compose browser-to-API smoke check are green. | [Docker Compose specification](docs/docker-compose.md) |
| Development H2 and production PostgreSQL profiles | DONE | Both isolated Compose journeys passed: dev H2 console/demo login, plus Flyway PostgreSQL/database login/product persistence after backend restart. | [Environment profile plan](docs/environment-profiles.md) |

`DONE` requires the evidence named in its row. The in-memory H2 database is an
intentional local-development simplification, not persistent application state.
