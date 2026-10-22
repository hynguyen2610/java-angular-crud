# Next: private product-image API contract and backend slice

## Current outcome

Implement the approved authenticated product-image API through its backend
storage boundary, then verify the contract and persistence mapping. The
governing specification is
[docs/product-image-storage.md](docs/product-image-storage.md).

## Scope and delivery surfaces

- API/contract: add the three image operations and `Product`/error schemas to
  `docs/openapi.yaml`; implement byte validation, private retrieval, and
  recoverable storage failures in `backend/src/main/java/com/example/crud/product`.
- Data/runtime: retain the committed nullable metadata migration; finish the
  MinIO configuration, private-bucket bootstrap, resilience policy, and
  focused tests. PostgreSQL migration plus Hibernate validation are required.
- Browser UI and browser-to-API: sequential after the backend contract is
  green, because they consume the endpoints and error semantics.
- Realtime: N/A for image operations; the specification keeps current product
  lifecycle events unchanged.

## Acceptance evidence

- Upload, replacement, retrieval, removal, authentication, malformed/invalid
  content, and unavailable-storage scenarios have focused Red-to-Green tests.
- Product responses expose only `hasImage`, never object keys or credentials.
- `docker compose config --quiet`, OpenAPI validation, focused and full backend
  tests, isolated PostgreSQL migration/schema validation, and MinIO outage
  evidence are recorded before this backend slice is complete.

## Constraints and sequencing

- The current worktree's MinIO dependency and Compose edits are part of this
  slice; preserve the private bucket and do not expose MinIO ports or browser
  credentials.
- This work is **sequential**: OpenAPI, controllers, Angular client, and
  product representation share one contract. No parallel-safe lane exists.
- Product deletion must commit even if post-commit object cleanup is temporarily
  unavailable. Keep uploads/replacements from changing the active metadata on
  a validation or storage failure.

## Handoff condition

Advance to focused Angular upload/preview work only after the backend contract,
storage failure semantics, PostgreSQL validation, and runtime evidence are
green. The later browser journey remains required before marking the feature
`DONE`.
