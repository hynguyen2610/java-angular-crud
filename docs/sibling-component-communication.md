# Product-list sibling communication specification

## Outcome and boundaries

The `/products` route keeps its current URL, API calls, authentication, and
product-list behavior while making sibling communication visible in the UI.
`ProductListComponent` remains the route component and parent mediator.
`ProductSearchToolbarComponent` and `ProductTableComponent` render beneath it
at the same time; they do not inject or reference each other.

The parent receives child outputs, owns search, loading, error, and page state,
calls the existing `ProductService`, and passes display data down to the table.
No API route, request/response payload, authorization rule, persistence, or
realtime protocol changes.

## Delivery surfaces and acceptance scenarios

| Surface | Scenario | Evidence |
|---|---|---|
| API/contract | N/A: all existing `ProductService` calls and payloads remain unchanged. | Existing service contract test. |
| Browser UI | SC-1: typing a search term in the toolbar causes the parent to load page zero and the sibling table displays the returned products. | Focused parent-component test. |
| Browser UI | SC-2: confirming a table delete action reaches the parent, deletes the selected product, and reloads the displayed page. | Focused parent-component test. |
| Browser UI | SC-3: a failed delete shows a readable error and leaves the route usable. | Focused parent-component test. |
| Browser-to-API journey | N/A for this slice: the browser-to-API request shape and route are unchanged; the existing service tests cover those requests. | No new end-to-end runner is configured in this repository. |
| Realtime behavior | N/A: the application has no realtime client or protocol. | Source inspection. |

## Data flow

```text
ProductSearchToolbarComponent --searchChanged--> ProductListComponent
ProductListComponent --page / loading / error--> ProductTableComponent
ProductTableComponent --deleteRequested--> ProductListComponent
ProductListComponent --existing HTTP calls--> ProductService
```
