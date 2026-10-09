# UI design quality baseline

## Direction

The application is a compact product-management tool. Its visual basis is the
existing light/dark neutral interface with one blue action color, not a
marketing-page redesign. `frontend/src/styles/tokens.css` owns shared color,
spacing, typography, shape, and elevation tokens.

## Delivery surfaces

| Surface | Status | Acceptance scenario | Evidence |
|---|---|---|---|
| API/contract | N/A | Presentation changes do not alter HTTP or authentication contracts. | Source review. |
| Realtime | N/A | Notification event behavior is unchanged. | Source review. |
| Browser UI | In progress | Controls have visible focus, disabled, hover, loading/error, and validation treatments; product results announce loading, give an actionable empty state, and offer retry on request failure. Tables remain usable at narrow widths. | Angular typecheck and production build pass. Focused browser specs are blocked by the known esbuild deadlock; protected product-state screenshot review needs the local production bootstrap credential. |
| Browser-to-API | N/A | Existing journeys and request behavior are unchanged. | Source review. |

## Rules

- Use only the shared tokens for new color, spacing, type, radius, and shadow choices.
- Reuse existing components before making a visual primitive.
- Maintain contrast, keyboard focus, and practical 44px control targets.
- Treat loading, empty, validation, recoverable-error, success, disabled, hover, and focus-visible states as feature requirements.
- Capture and review responsive screenshots before declaring a material UI change complete. Builds and unit tests are not visual evidence.

## Product-results state evidence

- Loading: a status announcement says that products are loading while retained
  results are marked busy.
- Empty: an empty result gives the user two recoveries: change the search or
  create a product.
- Recoverable error: the server-provided reason is announced and **Try again**
  reloads the current search and page without changing the HTTP contract.

## Remaining evidence gap

The protected product journey still needs browser screenshots at 375px, 768px,
and 1280px after signing in with the configured local production bootstrap
account. The documented development credentials correctly fail in the
production Compose profile, so this check must not guess or expose that
credential. The new focused component specs could not run because Angular's
esbuild test process deadlocked before executing them.
