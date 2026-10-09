# Docker Maven cache warm-up resolves an unavailable Jackson snapshot

## Symptom and scope

`docker compose up --build` failed while building the backend image. The stack
never started, so the Angular application could not reach its API.

## Root cause

The backend Dockerfile used Maven's `dependency:go-offline` goal before copying
application sources. The Yubico WebAuthn dependency publishes a broad Jackson
version range. In this goal's resolution path, Maven selected an unavailable
`jackson-databind:2.18.10-SNAPSHOT` instead of the Spring Boot-managed released
version (`2.17.2`). Normal Maven dependency mediation resolves the released
version correctly.

## Evidence

The failing Docker build reported the unavailable snapshot while executing
`dependency:go-offline`. Running `mvn dependency:tree` resolved
`jackson-databind` and `jackson-dataformat-cbor` to `2.17.2`. A subsequent
uncached Compose build completed with Maven's normal dependency resolution,
and the running stack returned health `UP` and a successful proxied demo login.

## Resolution

The manifest-first BuildKit cache layer in `backend/Dockerfile` now runs
`dependency:resolve dependency:resolve-plugins`. It continues to warm Maven
dependencies before source is copied, while respecting the application's
managed dependency versions.

## Prevention

Keep the Docker dependency warm-up on normal Maven resolution rather than
`go-offline` while this dependency graph contains version ranges. Verify an
uncached `docker compose build --no-cache`, then a repeated
`docker compose --progress=plain build`, before changing Maven dependencies or
the Dockerfile.
