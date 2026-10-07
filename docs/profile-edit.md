# Profile edit

## Status

**IN PROGRESS — backend tests, TypeScript checks, and the production build are green; the focused Karma run launched Chrome but did not produce a browser/spec completion summary.**

## Scope

An authenticated user can read and change only their username. Passwords and roles are never read or edited through this feature. A successful request invalidates the old username's bearer token and signs the browser out; the user must sign in using the new username and their existing password.

In the `dev` profile, the rename is held by the in-memory user store and resets when the process restarts. In `prod`, the change is persisted through the `app_user` table. The unique database constraint remains the final protection against duplicates.

## Acceptance scenarios

| Scenario | Expected result |
|---|---|
| Authenticated user opens Profile | The form loads their username from `GET /api/auth/me`. |
| Valid username is saved | `PUT /api/auth/me` returns the new username; the old token is rejected and the browser returns to sign-in. |
| Username is blank or longer than 100 characters | The API returns the standard `400` validation error shape and the form displays the field error. |
| Username already exists | The API returns `409` with a `username` field error; the browser preserves the entered value for correction and retry. |
| Unauthenticated caller requests either operation | The API returns `401`. |

The full machine-readable HTTP contract is [openapi.yaml](openapi.yaml).
