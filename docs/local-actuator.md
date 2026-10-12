# Local Actuator diagnostics

## Scope

When the application runs with the `dev` profile, a developer on the same Mac
can inspect these diagnostic endpoints directly on the backend port:

- `/actuator/health`
- `/actuator/metrics`
- `/actuator/info`
- `/actuator/env`
- `/actuator/beans`

The Docker development backend port is bound to `127.0.0.1`, so these endpoints
are not reachable from the local network. The frontend remains unchanged and
does not proxy Actuator paths.

## Security and compatibility

- Development permits the listed Actuator endpoints without an application JWT
  so normal local diagnostic tools can use them.
- `/actuator/env` redacts all property values; it is for property names and
  sources, not secret retrieval.
- Production keeps the existing public health endpoint and exposes no detailed
  Actuator endpoints. Application API, passkey, database, and frontend routes
  are unchanged.

## Acceptance scenarios

| Scenario | Expected result |
|---|---|
| Dev diagnostics | Each listed endpoint returns HTTP 200 without a JWT. |
| Dev secret protection | The `/actuator/env` response does not contain the configured JWT-secret value. |
| Production restriction | Detailed Actuator endpoints are not web-exposed; only `/actuator/health` remains public. |
| Compose host boundary | `docker compose up` publishes the backend only on `127.0.0.1:8080`. |
