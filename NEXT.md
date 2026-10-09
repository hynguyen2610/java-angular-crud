# Next: PK1 single-passkey authentication

## Current outcome

Complete the approved username-first WebAuthn passkey feature described in
[docs/passkey-authentication.md](docs/passkey-authentication.md), then make it
safe to commit as one additive authentication slice.

## Ownership and surfaces

- API/contract: `backend/src/main/java/com/example/crud/auth/Passkey*`,
  `AuthController.java`, `SecurityConfig.java`, migration `V2`, and
  `docs/openapi.yaml`.
- Browser UI: `frontend/src/app/core/passkey.service.ts`, auth/profile
  components and focused specs.
- Realtime: N/A; the approved specification records no STOMP behavior.
- Browser-to-API: secure-context manual Touch ID journey remains required.

## Acceptance and current evidence

- One verified platform credential per username; password-confirmed enrollment,
  generic public assertion failure, single-use/expiring challenges, and JWT
  issuance only after verified assertion.
- Full backend verification passes with Java 17: 21 tests green. Focused
  profile regression coverage proves a renamed user retains their passkey.
- Default `docker compose up --build` is green after replacing the backend
  cache warm-up's `go-offline` goal. Backend health is `UP` and the frontend's
  same-origin demo login succeeds; see the Docker incident record for cause
  and repeat-build evidence.
- TypeScript compilation passes. The focused Chrome Headless command exits
  successfully but only emits `Building...` in this environment, so browser
  specs are not recorded green without a normal Karma success summary.
- Still required: OpenAPI validation, full backend/Angular verification,
  completed Angular build, and the secure-context browser journey.

## Constraints and blockers

- Keep password login as recovery and do not modify unrelated profile/realtime
  work already present in the tree.
- This slice is **sequential**: API, migration, OpenAPI, and browser client
  share the authentication contract. No parallel lanes are safe.
- Local Spring tests currently need Java 17 because the default Java 21 test
  process cannot attach Mockito's agent in this environment.

## Handoff condition

Update this file with actual command evidence; only then provide a path-scoped
`feat(auth): add single Touch ID passkey login` commit handoff with a `Next:`
body line.
