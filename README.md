# Java + Angular CRUD (interview practice project)

Spring Boot 3 (Java 17) REST API + Angular 19 (standalone components, signals).
Domain: **Products** with login, list/search/pagination, create, edit, delete.

```
java-angular-crud/
  backend/    Spring Boot API   (http://localhost:8080)
  frontend/   Angular 19 SPA    (http://localhost:4200)
```

## Run the complete system with Docker Compose

Prerequisites: Docker Desktop (or Docker Engine with the Compose plugin).

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:4200` and sign in with **admin / admin123**. The Angular
application is served by Nginx; Nginx proxies `/api/*` to Spring Boot, so the
browser remains on one origin. The API and H2 console are also available at
`http://localhost:8080` and `http://localhost:8080/h2-console`.

To stop the stack, press `Ctrl+C`, or run:

```bash
docker compose down
```

The application uses an in-memory H2 database, so product data is deliberately
reset whenever the backend container is recreated. `.env` is ignored; replace
the demo `JWT_SECRET` before using this setup outside local development.

Run the end-to-end Compose smoke check (it starts and stops the stack):

```bash
./scripts/verify-compose.sh
```

For frontend-only development, install the pinned dependencies once and use
the existing proxy configuration:

```bash
cd frontend
npm ci
npm start
```

## 1. Run the backend

Needs JDK 17+ and Maven. The Docker workflow above is the recommended way to
run both services together.

```bash
cd backend
mvn spring-boot:run
```

- API: `http://localhost:8080/api/products` (needs a token)
- H2 console: `http://localhost:8080/h2-console` (JDBC URL `jdbc:h2:mem:cruddb`, user `sa`, empty password)
- Demo login: **admin / admin123**

## 2. Set up the frontend

Needs Node 20+. The Angular CLI is pinned to v19 in `frontend/package.json`.

```bash
cd frontend
npm ci
npm start
npm test
```

Open `http://localhost:4200`. The proxy forwards `/api/*` to Spring, so the browser sees one origin and CORS is not involved in development.

## Try this to see the pieces work

| Try | What happens | Where |
|---|---|---|
| Open `/products` while logged out | Redirected to `/login?returnUrl=/products` | `auth.guard.ts` |
| Log in | Token stored, attached to every request | `auth.service.ts`, `auth.interceptor.ts` |
| Type in the search box | Request fires 300 ms after you stop typing; older requests are cancelled | `product-list.component.ts` |
| Save a product with a blank name (disable the browser's `required` by editing the form) | Spring returns 400 with `errors.name`, shown under the field | `GlobalExceptionHandler.java`, `product-form.component.ts` |
| Change `app.jwt.expiration-ms` to `10000`, wait, then click anything | 401 -> auto logout -> login page | `error.interceptor.ts` |
| Open a bad URL like `/api/products/999` | 404 with a readable message | `NotFoundException.java` |

## Interview topic map

### Angular

| Topic | File |
|---|---|
| Standalone components, `@Component` metadata | every `*.component.ts` |
| Routing, lazy loading (`loadComponent`), nested routes | `app.routes.ts` |
| Functional route guard + `returnUrl` | `core/auth.guard.ts` |
| `inject()`, services, `providedIn: 'root'` | `core/*.service.ts`, `product.service.ts` |
| `InjectionToken` (with default factory) | `core/tokens.ts` |
| Injected `DOCUMENT`, signals + `effect()` (theme) | `core/theme.service.ts` |
| `HttpClient`, `HttpParams`, typed responses | `product.service.ts` |
| Functional interceptors (auth header, global 401) | `core/auth.interceptor.ts`, `core/error.interceptor.ts` |
| Reactive forms, validators, server-side errors on controls | `product-form.component.ts` |
| Sibling components via parent-owned state and input/output events | `product-list.component.ts`, `product-search-toolbar.component.ts`, `product-table.component.ts` |
| Template binding: `{{ }}`, `[prop]`, `(event)`, `[formControl]` | all templates |
| Control flow `@if`, `@for` + `track`, `@empty`, `@if (x; as y)` | `product-list.component.ts` |
| Pipes: `currency`, `date` | `product-list.component.ts` |
| RxJS: `switchMap`, `debounceTime`, `distinctUntilChanged`, `catchError`, `BehaviorSubject` | `product-list.component.ts` |
| Avoiding leaks: `takeUntilDestroyed()` | `product-list.component.ts` |
| `OnPush` change detection with signals | list and login components |
| Signals: `signal`, `computed`, `asReadonly` | `auth.service.ts` |
| Lifecycle: `ngOnInit` for route params | `product-form.component.ts` |
| Unit test with `HttpTestingController` | `product.service.spec.ts` |
| Pagination, search, delete + reload | `product-list.component.ts` |

### Spring Boot

| Topic | File |
|---|---|
| Layered design: controller -> service -> repository | `product/*` |
| DTO record vs JPA entity | `ProductDto.java`, `Product.java` |
| Bean Validation (`@Valid`, `@NotBlank`, ...) | `ProductDto.java`, `ProductController.java` |
| Global error handling with a uniform `ApiError` | `error/GlobalExceptionHandler.java` |
| Pagination + sorting with Spring Data | `ProductService.java`, `ProductRepository.java` |
| Stable page JSON (own `PageResponse`) | `PageResponse.java` |
| Stateless JWT security, filter, 401 vs 403 | `auth/SecurityConfig.java`, `JwtAuthFilter.java`, `JwtService.java` |
| BCrypt password hashing | `SecurityConfig.java` |
| CORS configuration | `SecurityConfig.java` |
| Transactions, dirty checking on update | `ProductService.java` |
| `@PrePersist`, `LocalDateTime` as ISO JSON | `Product.java` |

## Known simplifications (say these out loud in an interview)

- One hard-coded in-memory user and role. Real apps load users from the database and put roles in the token.
- JWT secret is in `application.properties`. Use an environment variable or secret manager.
- Token is in `localStorage`, which JavaScript can read (XSS risk). The alternative is an HttpOnly cookie, which then needs CSRF protection. Know both trade-offs.
- H2 in memory: data resets on every restart. Swap in PostgreSQL/MySQL by changing the datasource and driver.
- No refresh tokens. At expiry the user simply logs in again.

## Ideas to extend it (good practice)

1. Add `GET /api/products?sort=price,asc` and sortable column headers.
2. Add roles (`USER` can read, `ADMIN` can write) with `@PreAuthorize`.
3. Add image upload (`MultipartFile` on Spring, `FormData` on Angular).
4. Add a category entity with a one-to-many relation and a dropdown in the form.
5. Add a Spring `@WebMvcTest` for the controller and an Angular component test for the list.
6. Containerize: build Angular, copy `dist/` into Spring's `static/`, or serve it with Nginx.
