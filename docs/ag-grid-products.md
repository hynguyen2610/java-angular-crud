# Product AG Grid implementation specification

## Outcome and boundaries

Replace the hand-built results table on `/products` with AG Grid Angular. The
grid must preserve the current product search, delete, edit, loading, empty,
and recoverable-error journeys while adding virtualized rendering, user column
pinning, and saved views.

The current application is Angular 19. AG Grid's current compatibility chart
limits Angular 18–19 to AG Grid 28–35, so the implementation must pin the
latest compatible AG Grid 35.x release rather than install the current 36.x
line. `ag-grid-angular` and `ag-grid-enterprise`, if selected, must have the
same version.

This preparation does **not** install packages, change the existing API,
remove the native table, alter authentication, or change the STOMP product
event contract. The current API only supports `q`, `page`, and `size`, caps a
page at 50 rows, and always sorts by `id DESC`.

## Confirmed requirements

- Use AG Grid Angular rather than a hand-built table.
- Virtualize displayed rows.
- Let users pin columns.
- Let users save and restore named views.
- Retain the current search toolbar, edit navigation, confirmed delete, empty,
  loading, and retryable failure behavior.

## Approved decisions

| Decision | Approved choice | Result |
|---|---|---|
| Grid capability/licence | Variant B: AG Grid Community flat grid. | Use virtualized client-side rendering over the current paged result set. Do not add Enterprise packages or a licence key. |
| Data operations | Keep the current `q`, `page`, `size`, and fixed `id DESC` product API. | No OpenAPI, Spring, persistence, or authorization change. Sorting, grouping, and pivoting are out of scope. |
| Saved-view scope | Browser-local, per device. | Named views are stored only in local browser storage and are not synchronized between devices or accounts. Storage failure, invalid JSON, and obsolete state fall back to defaults without preventing grid use. |
| Export | Deferred. | Do not expose export controls in this slice. |

No licence key, trial key, or secret may be committed. An Enterprise key must
come from deployment configuration and be set only in the application startup
path, never in a component or saved-view payload.

## Selected variant — Community flat grid

Use AG Grid Community with its built-in DOM row virtualization and the
existing paged endpoint. Keep the existing search and API response shape;
offer pinning and browser-local named saved views containing only safe grid
state. Each view holds its name, a schema/version marker, and serializable grid
state. A saved view must never include product data, authentication data, or
application secrets. Sorting beyond fixed `id DESC`, grouping, pivoting, and
full-result export are explicitly out of scope.

This is the smallest safe migration but does not claim SSRM capabilities.

## Target design after approval

```text
Search toolbar --debounced query--> ProductListComponent
ProductListComponent --request / grid lifecycle--> ProductGridComponent
ProductGridComponent --row action / state update--> ProductListComponent
ProductListComponent --HTTP--> ProductService --GET /api/products--> Spring
ProductGridComponent --saved view state--> browser-local view store
```

`ProductListComponent` stays the route-level orchestrator. Extract a focused
`ProductGridComponent` for AG Grid configuration, stable column definitions,
grid lifecycle, and row-action outputs. Extract a `ProductGridViewService` for
serializing, validating, versioning, and restoring saved grid state; it must
not be owned by the rendering component. Every saved column requires a stable
`colId`/field so restore cannot apply state to the wrong column.

The grid component emits `deleteRequested(product)` and `editRequested(id)`;
the parent remains responsible for confirmation, mutation, navigation, HTTP
loading/error state, and retry. This retains the existing sibling/parent
boundary and keeps UI orchestration separate from persistence policy.

## Delivery surfaces and acceptance scenarios

| Surface | Scenario | Required evidence |
|---|---|---|
| API/contract | SC-1: Existing `q`, `page`, and `size` product requests and page response remain compatible for the selected flat-grid variant. For SSRM, every accepted grid request is documented and invalid/unsupported fields return a readable `400`. | `ProductService` HTTP test; Spring MVC tests; OpenAPI validation when contract changes. |
| Browser UI | SC-2: Search resets to the first result block/page and shows matching products in AG Grid. | Red-to-Green parent/grid component test. |
| Browser UI | SC-3: Grid renders only visible rows for a result set larger than its viewport; loading, empty, and error/retry states remain distinguishable and accessible. | Component test plus manual browser evidence. |
| Browser UI | SC-4: A user pins a supported column, saves a named view, changes the grid, and restores that view with the saved column state. Invalid or obsolete saved state is discarded with a recoverable message and default columns remain usable. | View-state service tests and component/browser evidence. |
| Browser UI | SC-5: Edit and confirmed delete actions operate on the intended row; delete success refreshes data and delete failure is readable and recoverable. | Focused component tests. |
| Realtime | SC-6: Existing `/topic/products` notifications continue to display. Grid data refresh-on-event is out of scope unless explicitly approved; HTTP remains authoritative. | Existing notification regression test; source inspection. |
| Browser-to-API journey | SC-7: An authenticated user searches, edits or deletes a row, and sees the refreshed grid/error recovery against the actual API. | Browser E2E if added; otherwise documented manual browser run against Compose. |

## Implementation sequence once approved

1. Preserve the current API and document any future expansion in
   `docs/openapi.yaml` before client code.
2. Add version-matched AG Grid packages and only required modules; add the
   vendor theme through the supported application styling mechanism.
3. Write Red component/service tests for SC-2 through SC-5.
4. Create `ProductGridComponent` and view-state service; retain focused
   parent orchestration in `ProductListComponent`.
5. Migrate columns (`name`, `price`, `quantity`, `createdAt`, actions) with
   stable IDs, accessible action labels, and a grid-owned loading/empty/error
   presentation that preserves the current recovery controls.
6. Implement the approved current paging model; do not introduce a server-side
   datasource, request parameters, or a backend query change.
7. Verify targeted tests, frontend type checks/build, backend/OpenAPI checks
   if applicable, `git diff --check`, and a manual browser journey. Do not
   call Karma green unless it produces a browser/spec success summary.

## Deferred scope unless separately approved

- Row grouping, pivoting, aggregation, and SSRM (Enterprise/API work).
- Arbitrary filter-to-database query translation.
- Full-dataset export or background export jobs.
- Cross-device/user-shared views and database persistence.
- Realtime row-level grid updates; the existing notification feed remains.
- Inline cell editing, bulk actions, and selection workflows.

## Ready for implementation

The selected Community slice may begin without further product/API decisions.
It remains bounded to browser-local views and the existing flat paged product
list. Any future request for server-side sorting/filtering, grouping, pivoting,
export, or shared views requires a new contract decision.
