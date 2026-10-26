# Java (Spring) + Angular Project Checklist

Legend: ✅ should-have feature/aspect · ⚠️ common trap

---

## 1. Architecture & Project Structure
- [ ] ✅ Clear layering in backend: `controller → service → repository`, DTOs separate from entities
- [ ] ✅ Frontend organized by feature modules / standalone components, with `core`, `shared`, `features`
- [ ] ✅ API contract defined first (OpenAPI/Swagger), ideally generating TypeScript clients
- [ ] ✅ Monorepo vs. multi-repo decision documented; versioning strategy for API
- [ ] ✅ Environment config separated per profile (`dev`, `test`, `prod`)
- [ ] ⚠️ Exposing JPA entities directly in REST responses (leaks fields, lazy-loading errors, tight coupling)
- [ ] ⚠️ Business logic leaking into controllers or Angular components

## 2. Authentication & Authorization
- [ ] ✅ Standard protocol (OAuth2 / OIDC; e.g. Keycloak, Auth0) rather than home-grown auth
- [ ] ✅ Spring Security with method-level security (`@PreAuthorize`) and role/permission model
- [ ] ✅ Angular route guards + HTTP interceptor to attach tokens and handle `401/403`
- [ ] ✅ Token refresh flow and logout (including server-side session/token revocation)
- [ ] ⚠️ Treating Angular route guards as security — they are UX only; enforce on the backend
- [ ] ⚠️ Storing JWT in `localStorage` (XSS risk); prefer HttpOnly secure cookies or in-memory + refresh
- [ ] ⚠️ Missing authorization checks on object level (IDOR: user A reads user B's record by ID)

## 3. Security
- [ ] ✅ CORS configured explicitly (specific origins, not `*` with credentials)
- [ ] ✅ CSRF strategy decided (cookie-based auth needs it; stateless bearer tokens usually don't)
- [ ] ✅ Input validation on backend (`@Valid`, Bean Validation) — never trust frontend validation
- [ ] ✅ Security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options)
- [ ] ✅ Dependency vulnerability scanning (OWASP Dependency-Check, `npm audit`, Dependabot/Renovate)
- [ ] ✅ Secrets in env vars / vault, never in git
- [ ] ✅ Rate limiting / brute-force protection on login and sensitive endpoints
- [ ] ⚠️ SQL injection through string-concatenated native queries or JPQL
- [ ] ⚠️ XSS via `innerHTML` / `bypassSecurityTrust*` in Angular
- [ ] ⚠️ Verbose error messages / stack traces returned to clients
- [ ] ⚠️ Logging sensitive data (passwords, tokens, PII)

## 4. API Design
- [ ] ✅ Consistent REST conventions: resource naming, HTTP verbs, status codes
- [ ] ✅ Pagination, sorting, filtering on all list endpoints
- [ ] ✅ Global exception handling (`@ControllerAdvice`) with a consistent error format (e.g. RFC 7807 Problem Details)
- [ ] ✅ API versioning strategy
- [ ] ✅ Idempotency for retryable operations (payments, order creation)
- [ ] ✅ Date/time in ISO-8601 UTC; clear contract for time zones
- [ ] ⚠️ Returning unbounded lists (no pagination)
- [ ] ⚠️ Using `200 OK` with an error body, or leaking internal exceptions
- [ ] ⚠️ Breaking changes to the API without versioning

## 5. Database & Persistence
- [ ] ✅ Schema migrations with Flyway or Liquibase (never `ddl-auto=update` in prod)
- [ ] ✅ Proper indexes based on query patterns; review slow-query logs
- [ ] ✅ Transaction boundaries on the service layer (`@Transactional`), correct isolation/propagation
- [ ] ✅ Optimistic locking (`@Version`) for concurrent updates
- [ ] ✅ Connection pool tuned (HikariCP) and monitored
- [ ] ✅ Auditing fields (`createdAt`, `updatedAt`, `createdBy`)
- [ ] ⚠️ **N+1 query problem** (lazy collections in loops) — use `JOIN FETCH`, entity graphs, or DTO projections
- [ ] ⚠️ `LazyInitializationException` and the `open-in-view` anti-pattern (set `spring.jpa.open-in-view=false`)
- [ ] ⚠️ `@Transactional` on private methods or self-invocation (proxy bypass → no transaction)
- [ ] ⚠️ `equals/hashCode` on entities using generated IDs or all fields
- [ ] ⚠️ `CascadeType.ALL`/`REMOVE` on large associations unintentionally deleting data
- [ ] ⚠️ Loading huge result sets into memory instead of streaming/paginating

## 6. Backend Code Quality & Performance
- [ ] ✅ Constructor injection (not field injection); small, focused beans
- [ ] ✅ Caching where appropriate (Spring Cache / Redis) with explicit TTL and invalidation
- [ ] ✅ Async/batch processing for heavy work (`@Async`, queues, Kafka, scheduled jobs)
- [ ] ✅ Scheduled jobs safe in multi-instance deployments (ShedLock or similar)
- [ ] ✅ Graceful shutdown, timeouts, retries, circuit breakers (Resilience4j) on external calls
- [ ] ✅ Use of Java records/immutability for DTOs; MapStruct for mapping
- [ ] ⚠️ Blocking calls without timeouts to external services
- [ ] ⚠️ Thread-unsafe shared state in singleton beans
- [ ] ⚠️ Catching and swallowing exceptions (`catch (Exception e) {}`)
- [ ] ⚠️ Cache without invalidation → stale data

## 7. Angular Frontend Fundamentals
- [ ] ✅ Strong typing (`strict: true` in `tsconfig`), typed API models, no `any`
- [ ] ✅ Smart (container) vs. presentational components
- [ ] ✅ `OnPush` change detection (or signals) for performance
- [ ] ✅ Lazy-loaded routes / deferred loading for large features
- [ ] ✅ State management appropriate to size (services + signals/RxJS, NgRx only when needed)
- [ ] ✅ Reactive forms with validators and clear error messages
- [ ] ✅ Centralized HTTP error handling via interceptor, plus loading indicators
- [ ] ✅ i18n/l10n set up early if multi-language is a possibility
- [ ] ✅ Accessibility (ARIA, keyboard navigation, contrast), tested with axe/Lighthouse
- [ ] ⚠️ **Memory leaks** from unsubscribed Observables (use `async` pipe, `takeUntilDestroyed`, `takeUntil`)
- [ ] ⚠️ Nested subscriptions instead of `switchMap` / `mergeMap` / `combineLatest`
- [ ] ⚠️ Calling functions in templates (re-run on every change detection) instead of pipes/computed values
- [ ] ⚠️ `*ngFor` without `trackBy` (or `@for` without `track`) on large lists
- [ ] ⚠️ Mutating inputs/state directly, breaking `OnPush`
- [ ] ⚠️ One giant shared module importing everything → huge bundle
- [ ] ⚠️ Duplicate HTTP calls because of multiple subscriptions to a cold Observable (use `shareReplay`)

## 8. Frontend–Backend Integration
- [ ] ✅ Proxy config for local dev (`proxy.conf.json`) to avoid CORS pain
- [ ] ✅ Generated or shared API client types to avoid contract drift
- [ ] ✅ File upload/download handled (size limits, streaming, content-type checks)
- [ ] ✅ WebSocket/SSE strategy if real-time features are needed
- [ ] ✅ Consistent handling of timezones, number formats, and enums between layers
- [ ] ⚠️ Frontend and backend validation rules drifting apart
- [ ] ⚠️ Serving Angular from Spring Boot vs. separate hosting not decided deliberately (caching, routing fallback to `index.html`)
- [ ] ⚠️ Deep-link 404s in production because the server doesn't fall back to `index.html`

## 9. Testing
- [ ] ✅ Backend unit tests (JUnit 5, Mockito), integration tests (`@SpringBootTest`, Testcontainers for DB/Kafka)
- [ ] ✅ API/contract tests (e.g. Spring Cloud Contract, Pact)
- [ ] ✅ Angular unit tests (Jest/Karma + Testing Library), component tests
- [ ] ✅ E2E tests (Cypress / Playwright) covering critical user journeys
- [ ] ✅ Coverage tracked in CI, with quality gate (SonarQube)
- [ ] ✅ Test data management and isolation
- [ ] ⚠️ Using H2 in tests while prod is PostgreSQL/Oracle (behavior differences) — prefer Testcontainers
- [ ] ⚠️ Flaky E2E tests relying on fixed `sleep`s
- [ ] ⚠️ Over-mocking so tests pass but nothing real is verified

## 10. CI/CD & DevOps
- [ ] ✅ Automated pipeline: build → test → static analysis → package → deploy
- [ ] ✅ Dockerized backend and frontend (multi-stage builds, non-root user, small images)
- [ ] ✅ Kubernetes/infra manifests or IaC (Helm, Terraform) versioned in git
- [ ] ✅ Health checks (`/actuator/health`: liveness & readiness probes)
- [ ] ✅ Zero-downtime deploys, rollback strategy, DB migration compatibility between versions
- [ ] ✅ Reproducible builds (lock files, pinned versions, `npm ci`)
- [ ] ⚠️ Config baked into images instead of externalized
- [ ] ⚠️ Running DB migrations that break the previous app version during rolling deploys
- [ ] ⚠️ Different Node/Java versions between local dev and CI

## 11. Observability
- [ ] ✅ Structured logging (JSON) with correlation/trace IDs across frontend → backend
- [ ] ✅ Metrics (Micrometer + Prometheus/Grafana), alerts on key SLOs
- [ ] ✅ Distributed tracing (OpenTelemetry) for multi-service systems
- [ ] ✅ Frontend error monitoring (Sentry or similar) and basic analytics/performance metrics
- [ ] ✅ Audit log for sensitive business actions
- [ ] ⚠️ Log levels misused (DEBUG in prod, or too little context at ERROR)
- [ ] ⚠️ No way to trace one user request across services

## 12. Performance & Scalability
- [ ] ✅ Frontend bundle budgets, tree-shaking, image optimization, HTTP caching/CDN
- [ ] ✅ Server-side compression, ETag/Cache-Control headers
- [ ] ✅ Load testing (k6, Gatling, JMeter) before go-live
- [ ] ✅ Stateless backend to allow horizontal scaling; sessions externalized if used
- [ ] ✅ Consider SSR / prerendering (Angular SSR) if SEO or first paint matters
- [ ] ⚠️ Heavy synchronous work in request threads
- [ ] ⚠️ JVM memory/GC defaults not tuned for containers (check container-aware heap settings)
- [ ] ⚠️ Large JSON payloads and over-fetching instead of tailored endpoints/projections

## 13. Maintainability & Team Practices
- [ ] ✅ Coding standards enforced: Checkstyle/Spotless/SpotBugs, ESLint/Prettier
- [ ] ✅ Code review checklist and PR template
- [ ] ✅ README with setup, run, test, and deploy instructions
- [ ] ✅ ADRs (architecture decision records) for key choices
- [ ] ✅ Dependency upgrade policy (Angular releases ~every 6 months; Java LTS cadence; Spring Boot support windows)
- [ ] ✅ Feature flags for risky releases
- [ ] ⚠️ Falling multiple major Angular/Spring Boot versions behind (painful migrations)
- [ ] ⚠️ Undocumented tribal knowledge and "works on my machine" setups
- [ ] ⚠️ Copy-pasted utilities instead of shared libraries

## 14. Data, Compliance & Business Concerns
- [ ] ✅ GDPR/privacy requirements: data retention, deletion, consent, PII encryption
- [ ] ✅ Backup and restore tested (not just configured)
- [ ] ✅ Soft delete vs. hard delete decided consciously
- [ ] ✅ Multi-tenancy strategy if applicable (schema, discriminator column, DB per tenant)
- [ ] ✅ Handling of money: `BigDecimal`/minor units, never `double`
- [ ] ⚠️ Time zone and DST bugs (`LocalDateTime` where `Instant`/`ZonedDateTime` is needed)
- [ ] ⚠️ Character encoding issues (always UTF-8 end to end)

---

## Quick "Definition of Done" for a Feature
- [ ] Input validated on both frontend and backend
- [ ] Authorization enforced on the backend (incl. object-level)
- [ ] Error cases handled and shown to the user clearly
- [ ] Unit + integration tests (and E2E for critical flows)
- [ ] Migration script included and backward compatible
- [ ] Logging/metrics added; no sensitive data logged
- [ ] API docs updated (OpenAPI)
- [ ] Performance considered (pagination, indexes, N+1 checked)
- [ ] Accessibility and responsive behavior checked
- [ ] Reviewed, merged, and deployed through the pipeline
