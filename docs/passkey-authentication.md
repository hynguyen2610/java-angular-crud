# Single-passkey authentication

## Status

**IN PROGRESS — approved 2026-10-09.** This is an additive authentication
method. Username/password sign-in remains the recovery path.

## Outcome and decisions

An already authenticated user may register at most one WebAuthn credential.
At sign-in they enter their username first, then use the registered passkey.
On a Touch-ID-capable Mac, the browser may use Touch ID; the application never
receives biometric data.

The credential is tied to the current relying-party ID and HTTPS origin (or
`localhost` during local development). Registration requires the currently
authenticated bearer token and the current password, preventing a stolen
unlocked browser session from silently enrolling another authenticator.
Registering a second credential returns `409`; replacement and deletion are
out of scope. The regular password form remains usable after cancellation,
unsupported-browser detection, and any recoverable passkey error.
Renaming a profile username transfers its registered passkey to the renamed
user so the credential remains usable.

## Interaction design

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Angular browser
  participant API as Spring API
  participant DB as Credential store
  participant A as Platform authenticator

  U->>UI: Sign in with username
  UI->>API: POST assertion/options { username }
  API->>DB: Find that user's one credential
  API-->>UI: Challenge and allowCredential
  UI->>A: navigator.credentials.get()
  A-->>UI: Signed assertion after Touch ID/device verification
  UI->>API: POST assertion/verify { username, response }
  API->>DB: Verify challenge, origin, RP ID, credential, signature; update counter
  API-->>UI: JWT login response
```

Challenges are single-use, expire in five minutes, and are held only in the
server process for this single-instance application. A browser cancellation
does not call verification. Concurrent enrollment is protected by the database
unique constraint on `username`; concurrent use of a challenge succeeds once.

## Public HTTP contract

| Operation | Authorization | Success | Failure / recovery |
|---|---|---|---|
| `POST /api/auth/passkey/registration/options` | Bearer JWT and `{ password }` | WebAuthn creation options | `400` invalid request, `401` invalid/expired token or password, `409` existing passkey; keep password form usable |
| `POST /api/auth/passkey/registration/verify` | Bearer JWT | `204` after verified, persisted credential | `400` malformed/expired/replayed response, `409` existing passkey; no partial credential |
| `POST /api/auth/passkey/assertion/options` | Public, `{ username }` | assertion options for that username | Generic `400` for blank input or no passkey; do not reveal account/passkey state |
| `POST /api/auth/passkey/assertion/verify` | Public, `{ username, response }` | existing `LoginResponse` JWT | Generic `401` on any failed assertion; password sign-in remains available |

## Acceptance matrix

| Surface | Scenario | Evidence |
|---|---|---|
| API/contract | Authenticated password-confirmed user registers exactly one credential; duplicate, invalid password, expired/replayed challenge, wrong origin/RP ID, unknown credential, and invalid signature are rejected. | Red-to-Green Spring service/controller tests and OpenAPI review. |
| Browser UI | Profile exposes a register action; it reports support, duplicate, cancellation, and recoverable errors without losing the password input or signing the user out for a wrong password confirmation. | Red-to-Green Angular component/service tests. |
| Browser UI | Native passkey cancellation, interruption, unsupported-device, stale-browser-credential, and insecure-origin failures explain recovery steps; only unclassified failures use the generic fallback. | Red-to-Green Angular component/service tests; manual native-browser journey remains required. |
| Browser UI | Login prompts for username first; only a successful verified assertion stores the JWT and follows `returnUrl`. | Red-to-Green Angular component/service tests. |
| Browser-to-API | On `https://localhost` or production HTTPS, a registered Mac user signs in with Touch ID; password login still works. | Manual browser journey; not claimed green until performed. |
| Realtime | N/A — WebAuthn authentication neither produces nor consumes STOMP events. | Design/source inspection. |

## Angular notes

`PasskeyService` owns `navigator.credentials` conversion and the HTTP exchange;
components retain reactive-form state and presentation. This is closest to a
React API hook, but Angular injects a singleton service while component-local
loading and error states remain signals. The browser ceremony is initiated only
from a user click, so no subscription outlives the component. User-visible
impact: eligible Mac browsers can present Touch ID; other browsers retain the
password path unchanged.

## Deferred scope

Username-less/discoverable login, multiple credentials, credential management,
cross-device account recovery, attestation policy, and distributed challenge
storage are separate approved-design work.

## Regression protection

The profile controller regression test seeds a credential, renames `admin` to
`editor`, and proves the credential moves with the user. The global Angular
error interceptor has an explicit request context exemption for password
confirmation during passkey enrollment; ordinary expired-token `401` handling
is unchanged. The profile component test also proves a native WebAuthn
`NotAllowedError` keeps the password confirmation and gives recoverable
Touch-ID guidance rather than an opaque generic error.
