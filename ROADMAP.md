# Roadmap

| Phase | Status | Completion evidence | Active work |
|---|---|---|---|
| Product CRUD application | PARTIALLY DONE | Spring API and Angular source are present; additional product behavior remains outside this packaging slice. | [Docker Compose specification](docs/docker-compose.md) |
| Product validation hardening | IN PROGRESS | See [validation specification](docs/product-validation.md) for API, browser UI, browser-to-API, and realtime-scope scenarios. | Extract client validation/error mapping and add API/UI evidence. |
| Reproducible local stack | DONE | `docker compose config`, both Docker image builds, and the Compose browser-to-API smoke check are green. | [Docker Compose specification](docs/docker-compose.md) |
| Development H2 and production PostgreSQL profiles | DONE | Both isolated Compose journeys passed: dev H2 console/demo login, plus Flyway PostgreSQL/database login/product persistence after backend restart. | [Environment profile plan](docs/environment-profiles.md) |
| Frontend backend readiness | IN PROGRESS | Isolated Compose proved the shell while Spring was starting (`503` health), then `UP` and same-origin login. Focused Karma browser evidence remains inconclusive. | [Backend-readiness specification](docs/backend-readiness.md) |
| Profile identity, display name, picture, and product lifecycle notifications | IN PROGRESS | Product lifecycle notices are in progress. Existing username-renaming profile behavior conflicts with the proposed immutable-username/display-name/picture revision; no picture-storage, browser, or migration evidence exists yet. | [Specification](docs/profile-and-product-notifications.md) |
| Private product images with MinIO resilience | IN PROGRESS | Backend API, Flyway `V4` metadata, and MinIO Compose service are implemented; the full backend suite is green, including PostgreSQL schema validation. No Angular UI, Compose upload journey, or MinIO outage evidence exists yet. | [Frontend delivery plan](docs/product-image-storage.md#frontend-delivery-plan-test-driven) and [NEXT.md](NEXT.md) |

`DONE` requires the evidence named in its row. The in-memory H2 database is an
intentional local-development simplification, not persistent application state.
