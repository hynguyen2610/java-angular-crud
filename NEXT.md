# Next: product-image browser UI and browser-to-API journey

## Current outcome

Deliver the Angular side of private product images, test-first, against the
backend contract that is already implemented and green. The governing
specification is
[docs/product-image-storage.md](docs/product-image-storage.md); its
[frontend delivery plan](docs/product-image-storage.md#frontend-delivery-plan-test-driven)
lists the steps and the Red tests for each.

## Scope and delivery surfaces

- Browser UI: image API methods in `ProductService`, a new
  `ProductImageComponent` (authenticated blob fetch plus object-URL lifecycle),
  upload/replace/remove in the product form, a compact preview in the product
  table, and clearing image state on logout.
- Delivery: `frontend/nginx.conf` needs `client_max_body_size 6m;` on `/api/`,
  or nginx rejects uploads over 1 MB before Spring sees them.
- Browser-to-API: Compose E2E for upload, replace, reload, backend restart,
  logout, and a controlled MinIO outage.
- API/contract: unchanged. Use `docs/openapi.yaml`, and don't change the
  backend to suit the UI without updating the spec.
- Realtime: N/A; image operations publish no lifecycle events.

## Acceptance evidence

- Each frontend step in the spec has a Red-to-Green Angular spec, and the full
  Angular test run, TypeScript checks, and production build are green.
- The Compose journey and outage behavior are recorded before the roadmap row
  moves to `DONE`.

## Open backend items (not blocking the UI)

Recorded in the spec's
[implemented backend behavior](docs/product-image-storage.md#implemented-backend-behavior):
no orphan reconciliation job; no read/delete retries; Actuator circuit metrics
not exposed; timeouts differ from the planned 3 s. Decide whether to build
these or amend the plan.

## Constraints and sequencing

- Sequential: steps 1 → 2 → 3/4 → 5 → 6 share the service and component
  contract. Step 7 (nginx) can go in at any point before the E2E.
- Angular must never use the image endpoint as a plain `<img src>`, because it
  needs the bearer token. Always fetch the image as a blob through `HttpClient`.
- Client-side type and size checks are only a convenience; the server stays
  authoritative.

## Handoff condition

Mark the feature `DONE` only when every applicable scenario in the spec's
acceptance table is green, including the browser journey and the outage.
