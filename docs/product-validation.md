# Product validation hardening specification

## Outcome and boundaries

Product creation and editing retain the existing URLs, bearer authentication,
HTTP methods, JSON field names, and success responses. Validation rules remain
the same: a name is required and at most 100 characters, description is at
most 500 characters, and price and quantity are required and non-negative.

Angular form components orchestrate form state, submission, and navigation.
Reusable client validation definitions and server-field-error mapping live in
focused modules. Spring remains the authoritative validator and returns its
existing `ApiError` field map for DTO validation failures.

This slice does not add a new business rule (such as currency precision),
change authorization, realtime behavior, database schema, or deployment.

## Delivery surfaces and acceptance scenarios

| Surface | Scenario | Evidence |
|---|---|---|
| API/contract | SC-1: an authenticated invalid product write returns `400` with `ApiError.errors` keyed by the invalid JSON field. Existing endpoint and valid-payload response shapes are unchanged. | Spring MockMvc test. |
| Browser UI | SC-2: invalid local name, description, price, and quantity values prevent a request and show the matching field feedback. | Focused Angular form test and validator unit tests. |
| Browser UI | SC-3: a server field error appears beside the affected control; correcting that control removes only its server error and allows retry. | Focused Angular form test and mapper unit test. |
| Browser-to-API journey | SC-4: the Angular service continues to submit the existing product JSON fields to the existing routes. | Existing service contract tests plus form submit test. |
| Realtime behavior | N/A: products use HTTP only; no realtime client or protocol exists. | Source inspection. |

## Angular design note

Angular uses exported `ValidatorFn` values and a pure `FormGroup` error mapper;
the nearest React analogue is a shared validation/schema helper used by a form
component. The component stays responsible for view state rather than the
independently testable validation policy. User-visible behavior is preserved,
apart from server field errors now reliably appearing beside their controls.

## Verification

Run the focused Angular validation/form specs, backend tests, the frontend
type-check/build, and `git diff --check`. A browser end-to-end runner is not
configured, so its absence remains an evidence limitation rather than a claim
of end-to-end proof.

## Current evidence

- Backend: `mvn --batch-mode --no-transfer-progress test` is green, including
  the authenticated malformed-price scenario.
- Frontend static verification: both application and spec TypeScript checks,
  plus `npm run build`, are green.
- Browser unit verification is still unresolved: Karma exits after `Building…`
  without a browser/spec summary (the repository's known esbuild issue). The
  roadmap remains `IN PROGRESS` until that runner emits an actual result.
