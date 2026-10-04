# Roadmap

| Phase | Status | Completion evidence | Active work |
|---|---|---|---|
| Product CRUD application | PARTIALLY DONE | Spring API and Angular source are present; additional product behavior remains outside this packaging slice. | [Docker Compose specification](docs/docker-compose.md) |
| Reproducible local stack | DONE | `docker compose config`, both Docker image builds, and the Compose browser-to-API smoke check are green. | [Docker Compose specification](docs/docker-compose.md) |

`DONE` requires the evidence named in its row. The in-memory H2 database is an
intentional local-development simplification, not persistent application state.
