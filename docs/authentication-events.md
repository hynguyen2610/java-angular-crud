# Authentication event logging

## Contract

The backend records credential-safe authentication events using the application logger:

- successful and failed password sign-ins include the requested username and `method=password`;
- successful and failed passkey assertions include the requested or verified username and `method=passkey`;
- `POST /api/auth/logout` records the authenticated username and returns `204`.

Passwords, bearer tokens, passkey responses, and credential identifiers are never included in these log entries. Logout is an audit signal only: JWTs remain stateless and the browser removes its local token immediately.

## Acceptance scenarios and evidence

| Surface | Scenario | Evidence |
| --- | --- | --- |
| API / contract | An authenticated `POST /api/auth/logout` returns `204`; unauthenticated calls remain `401`. | `ProfileControllerTest.recordsLogoutForTheAuthenticatedUser`; `docs/openapi.yaml` |
| Browser UI | Logout sends the audit signal, clears local authentication, and redirects even if the signal fails. Its `401` cannot trigger another logout. | `auth.service.spec.ts`; `auth-request-context.ts` |
| Realtime | N/A — the endpoint neither opens nor closes WebSocket connections; existing logout cleanup is unchanged. | Scope review |
| End-to-end | N/A — this repository has no configured browser-to-API E2E runner for the Angular app. | Scope review |

The focused backend test and TypeScript compilation are green. The Angular Karma run currently aborts in the local esbuild worker before a browser/spec completion summary, so it is not browser-test evidence.
