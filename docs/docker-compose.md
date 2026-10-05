# Docker Compose local-stack specification

## Outcome and scope

`docker compose up --build` runs the existing Angular product manager and its
Spring Boot API locally. The browser loads the SPA from `http://localhost:4200`
and calls the unchanged `/api/*` routes through the same-origin Nginx proxy.

This work does not change product CRUD routes, authentication rules, JWT token
format, database schema, or browser routing. H2 remains intentionally
in-memory, so no persistent volume is required or created.

## Build efficiency

Both Dockerfiles require BuildKit and keep dependency installation ahead of
application-source copies. Maven's local repository and npm's package cache
are BuildKit cache mounts, so a source-only rebuild reuses downloaded
dependencies. The backend runtime uses the smaller Alpine JRE image; it still
contains `curl` because the existing Compose health check requires it.

| Build scenario | Expected cache behavior | Evidence |
|---|---|---|
| Rebuild without changing dependency manifests | Maven/npm dependency layers are cached; only source compilation runs. | Two consecutive `docker compose --progress=plain build` runs show `CACHED` dependency-install steps on the second run. |
| Change `pom.xml` or a package manifest/lockfile | The corresponding dependency step is rerun; the other service can remain cached. | Build output identifies the affected service and dependency layer. |
| Run the optimized images | Existing ports, health check, Angular shell, and same-origin login journey work. | `./scripts/verify-compose.sh`. |

## Architecture

```mermaid
flowchart LR
  B[Browser :4200] -->|HTML, assets| W[Nginx frontend]
  B -->|/api/* same origin| W
  W -->|proxy /api/*| A[Spring Boot API :8080]
  A --> H[(H2 in-memory)]
```

## Delivery surfaces and acceptance scenarios

| Surface | Scenario | Evidence |
|---|---|---|
| API/contract | Existing API remains reachable at `:8080`; no route or payload changes are introduced. | Backend build and Compose health check against the existing H2 console endpoint. |
| Browser UI | `GET :4200/` returns the Angular shell and supports client-side route fallback. | Compose smoke check finds `<app-root>` in the served document. |
| Browser-to-API journey | A login request sent to `:4200/api/auth/login` reaches Spring through Nginx and returns the existing token response for `admin/admin123`. | Compose smoke check posts through the proxy and checks for `token`. |
| Realtime behavior | N/A: this application has no realtime protocol or client. | Source inspection; no Socket.IO/WebSocket dependency exists. |

## Assumptions and recovery

- `.env` is local-only and supplies `JWT_SECRET`; `.env.example` is a safe,
  deliberately non-production placeholder.
- H2 data resets after a backend restart by existing application design. No
  Docker volume should be deleted to recover this stack.
- If the host ports are occupied, stop the verified local process or change the
  host side of the Compose port mapping; container ports remain `4200` (web
  host mapping) and `8080` (API).

## Verification

Run `./scripts/verify-compose.sh`. It validates the rendered Compose file,
builds and starts both services, waits for Spring, checks the Angular shell,
and executes the login journey through the browser origin. It always runs
`docker compose down --remove-orphans` on exit and does not remove volumes.
