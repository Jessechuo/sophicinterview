# IT Asset Management Tool — Design Spec

Date: 2026-09-22
Source brief: SASB SI Assessment [Web-Coding], Part I (Part II write-ups are handled separately, later).

## 1. Goal

A web tool that lets an IT team track company assets: who holds what, what state it is in,
and what needs attention. Two fixed roles (Admin, Normal User). Delivered as source code,
README, seed SQL, and screenshots/demo.

## 2. Scope

| Tier | Feature | In scope |
|---|---|---|
| Must have | Login with hardcoded roles (Admin, User) | Yes |
| Must have | Asset list with CRUD, search, details view | Yes |
| Must have | Export asset list to .xlsx | Yes |
| Must have | Dashboard with at least one chart | Yes |
| Nice to have | User management: CRUD, assign role, export to .xlsx | Yes |
| Nice to have | Asset activity log (Create, Update, Delete, Assign, Unassign) | Yes |
| Extra | IT request ticket system | Yes |

Small touches included: server-side pagination, sortable columns, delete confirmations,
success/error toasts, inline form errors.

Out of scope: refresh tokens, password-reset email, SSO, ticket comments/attachments,
file uploads, i18n, frontend unit tests.

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript, Vite, React Router, TanStack Query, Axios, Ant Design (latest major), Recharts |
| Backend | ASP.NET Core Web API on .NET 10 (LTS), C# |
| Data access | EF Core + Npgsql, code-first migrations |
| Database | PostgreSQL 18 |
| Auth | JWT Bearer (HS256), BCrypt.Net password hashing |
| Excel | ClosedXML |
| API docs | OpenAPI + Swagger UI (Development only) |
| Tests | xUnit, `WebApplicationFactory`, disposable PostgreSQL database per test class |

## 4. Architecture

```
React SPA (Vite dev server :5173)
   │  /api/* proxied by Vite in dev (no CORS needed locally)
   ▼
ASP.NET Core Web API (:5080)
   ExceptionHandler → Authentication (JWT) → Authorization (roles) → Controller
   → model validation → Service → AppDbContext → PostgreSQL
```

- **One API project**, organised by folder: `Controllers`, `Services`, `Entities`, `Dtos`,
  `Data` (DbContext, migrations, seeder), `Infrastructure` (exception handler, JWT, Excel).
  No repository layer — `DbContext` is the unit of work.
- **Controllers** are thin: bind the request, call a service, return the result.
- **Services** hold all business rules and write activity-log rows in the same
  `SaveChanges` call as the change they describe, so a change and its log entry commit together.
- **Current user** is read from JWT claims via a small `ICurrentUser` service injected into services.

### Repository layout

```
sophic/
  backend/
    AssetManager.Api/
    AssetManager.Tests/
    AssetManager.sln
  frontend/
    src/
      api/          # axios instance, typed endpoint functions
      auth/         # AuthContext, ProtectedRoute, RoleGate
      components/   # layout, shared UI
      pages/        # Login, Dashboard, Assets, Users, ActivityLog, Tickets, errors
      types/
  database/seed.sql # pg_dump of the seeded demo DB (submission deliverable)
  docs/
  docker-compose.yml  # optional one-command run (built last)
  README.md
```

## 5. Data Model

Roles are a fixed enum `Role { Admin, User }` in code — not a table. Users live in the
database so user management is possible.

### User
| Field | Type | Notes |
|---|---|---|
| Id | int PK | |
| Username | string(50) | unique; stored lowercase so matching is case-insensitive |
| FullName | string(100) | required |
| Email | string(150) | required, unique; stored lowercase |
| PasswordHash | string | BCrypt |
| Role | enum | Admin / User |
| IsDeleted | bool | soft delete; deleted users cannot log in |
| CreatedAt, UpdatedAt | timestamptz | |

### Asset
| Field | Type | Notes |
|---|---|---|
| Id | int PK | |
| AssetTag | string(20) | unique among non-deleted (filtered index), e.g. `AST-0001` |
| Name | string(100) | required |
| Category | enum | Laptop, Desktop, Monitor, Phone, Tablet, Printer, Network, Peripheral, Other |
| Brand, Model | string(50) | optional |
| SerialNumber | string(100) | optional; unique among non-deleted when present |
| PurchaseDate | date | optional, not in the future |
| PurchaseCost | decimal(12,2) | optional, ≥ 0 |
| Location | string(100) | optional |
| Status | enum | InService, NeedsRepair, UnderMaintenance, Retired |
| AssignedToUserId | int? FK → User | null = unassigned |
| Notes | string(1000) | optional |
| IsDeleted | bool | soft delete |
| CreatedAt, UpdatedAt | timestamptz | |
| Version | xmin | Postgres row version for optimistic concurrency |

"Assigned" is derived from `AssignedToUserId`, never stored as a status.
"Needs attention" = `NeedsRepair` + `UnderMaintenance`.

### ActivityLog
| Field | Type | Notes |
|---|---|---|
| Id | int PK | |
| AssetId | int FK → Asset | |
| Action | enum | Created, Updated, Deleted, Assigned, Unassigned |
| PerformedByUserId | int FK → User | |
| TargetUserId | int? FK → User | the assignee for Assigned/Unassigned |
| Details | string(2000) | human-readable change summary, e.g. `Status: InService → NeedsRepair` |
| Timestamp | timestamptz | |

### Ticket
| Field | Type | Notes |
|---|---|---|
| Id | int PK | |
| Title | string(150) | required |
| Description | string(4000) | required |
| Priority | enum | Low, Medium, High |
| Status | enum | Open, InProgress, Resolved, Closed |
| CreatedByUserId | int FK → User | |
| RelatedAssetId | int? FK → Asset | optional |
| ResolutionNote | string(2000) | optional, set by Admin |
| CreatedAt, UpdatedAt, ResolvedAt | timestamptz | ResolvedAt set when status becomes Resolved |

### Relationships
- User 1—N Asset (as assignee)
- Asset 1—N ActivityLog; User 1—N ActivityLog (performer, target)
- User 1—N Ticket (creator); Asset 1—N Ticket (optional)

## 6. Permissions

| Capability | Admin | User |
|---|---|---|
| Dashboard | ✓ | ✓ |
| View / search / sort asset list, asset details | ✓ | ✓ |
| Create / edit / delete asset | ✓ | ✗ |
| Assign / unassign asset | ✓ | ✗ |
| Export assets to .xlsx | ✓ | ✓ |
| Activity log (global page and per-asset history) | ✓ | ✗ |
| User CRUD, set role, export users | ✓ | ✗ |
| Submit ticket | ✓ | ✓ |
| View tickets | all | own only |
| Change ticket status / add resolution note | ✓ | ✗ |

Enforced on the backend with `[Authorize(Roles = "Admin")]` and ownership checks in
services. The frontend hides actions a role cannot take, but that is convenience only.

## 7. Business Rules

- An asset can only be assigned to a non-deleted user.
- A `Retired` asset cannot be assigned.
- Assigning an already-assigned asset reassigns it: log `Unassigned` (previous holder)
  then `Assigned` (new holder).
- An assigned asset must be unassigned before it can be retired or deleted (409 otherwise).
- Every asset update logs `Updated` with a per-field diff; no-op updates write no log.
- A user with assets assigned cannot be deleted (409). An admin cannot delete their own
  account or remove their own Admin role.
- Deleting is soft for assets and users; soft-deleted rows are excluded from lists, search,
  counts, and exports.

## 8. API

All responses are JSON unless noted. Lists return
`{ items, page, pageSize, totalCount }`; `pageSize` default 10, max 100.

### Auth
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | anon | `{ username, password }` → `{ token, expiresAt, user }` |
| GET | `/api/auth/me` | any | current user profile |

### Assets
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/assets` | any | `search, status, category, assigned (true/false), sortBy, sortDir, page, pageSize` |
| GET | `/api/assets/{id}` | any | details incl. assignee |
| POST | `/api/assets` | Admin | create |
| PUT | `/api/assets/{id}` | Admin | update; body carries `version` |
| DELETE | `/api/assets/{id}` | Admin | soft delete |
| POST | `/api/assets/{id}/assign` | Admin | `{ userId }` |
| POST | `/api/assets/{id}/unassign` | Admin | |
| GET | `/api/assets/export` | any | .xlsx; same filters as list, no paging |

Per-asset history uses `GET /api/activity-logs?assetId={id}`.

Search is case-insensitive (`ILIKE`) across AssetTag, Name, Brand, Model, SerialNumber,
Location, and assignee name. `sortBy` is whitelisted (tag, name, category, status,
purchaseDate, assignee).

### Activity log and dashboard
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/activity-logs` | Admin | `assetId, action, from, to, page, pageSize` |
| GET | `/api/dashboard/summary` | any | `{ total, assigned, unassigned, needsAttention, byStatus[], byCategory[] }` |

### Users (Admin)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/users` | `search, role, page, pageSize` |
| GET | `/api/users/{id}` | details incl. assigned assets |
| POST | `/api/users` | create (password required, min 8 chars) |
| PUT | `/api/users/{id}` | update profile/role; optional new password |
| DELETE | `/api/users/{id}` | soft delete |
| GET | `/api/users/export` | .xlsx |

### Tickets
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/tickets` | any | Admin: all; User: own. `status, priority, page, pageSize` |
| GET | `/api/tickets/{id}` | owner/Admin | |
| POST | `/api/tickets` | any | create |
| PUT | `/api/tickets/{id}/status` | Admin | `{ status, resolutionNote }` |

## 9. Frontend

| Route | Role | Content |
|---|---|---|
| `/login` | anon | username/password form |
| `/` | any | dashboard: 4 stat cards, assigned-vs-unassigned pie, status bar chart, category bar chart |
| `/assets` | any | paged, sortable table; search box; status/category/assigned filters; Export button; Admin: New, Edit, Delete |
| `/assets/new`, `/assets/:id/edit` | Admin | shared `AssetForm` |
| `/assets/:id` | any | details card; Admin: Assign/Unassign dialog, activity history tab |
| `/activity` | Admin | global activity log with filters |
| `/users` | Admin | paged table, create/edit modal, delete confirm, Export |
| `/tickets` | any | list (own or all); New Ticket |
| `/tickets/new` | any | ticket form with optional related asset |
| `/tickets/:id` | owner/Admin | details; Admin: status + resolution note |
| `/forbidden`, `*` | — | 403 and 404 pages |

- `AuthContext` holds the token and user; token kept in `localStorage` (accepted trade-off
  for an internal tool; noted in README).
- `ProtectedRoute` redirects to `/login` when there is no valid token; `RoleGate` sends
  non-admins to `/forbidden` on admin routes.
- Sidebar menu items are filtered by role.

## 10. Key Flow: Login → Asset Assignment

1. User submits credentials → `POST /api/auth/login`. Backend finds a non-deleted user,
   verifies the BCrypt hash, issues a JWT (`sub`, `name`, `role`, 8 h expiry).
   Wrong credentials → generic 401 "Invalid username or password".
2. SPA stores the token, sets it as the Axios `Authorization` header, redirects to `/`.
3. Dashboard loads `GET /api/dashboard/summary`.
4. User opens Assets → `GET /api/assets?page=1&pageSize=10`; searches/filters re-query.
5. User opens an asset → `GET /api/assets/{id}`.
6. Admin clicks Assign, picks a user, confirms → `POST /api/assets/{id}/assign`.
   Service validates the rules in §7, sets `AssignedToUserId`, adds the log row(s),
   saves once. UI shows a success toast and refetches the asset and its history.
7. Any 401 at any point clears the session and returns to `/login` with an
   "session expired" notice.

## 11. Error Handling

Backend (all errors are RFC 7807 `ProblemDetails` with a `traceId`):

| Situation | Status | Mechanism |
|---|---|---|
| Invalid input (missing/oversized/out-of-range fields) | 400 | DataAnnotations on DTOs; `[ApiController]` returns `ValidationProblemDetails` with per-field errors |
| Input that passes field validation but references something invalid (e.g. assign to a user id that does not exist) | 400 | service throws `BadRequestException` |
| Entity not found or soft-deleted | 404 | `NotFoundException` |
| Duplicate AssetTag / SerialNumber / Username / Email | 409 | pre-check in service; Postgres `23505` also mapped as a fallback |
| Stale `version` on asset update | 409 | `DbUpdateConcurrencyException` → "modified by someone else, reload" |
| Rule conflicts in §7 (assign retired, delete assigned, etc.) | 409 | `ConflictException` |
| No / expired / invalid token | 401 | JWT middleware |
| Authenticated but wrong role / not owner | 403 | `[Authorize(Roles)]`; ownership check throws `ForbiddenException` |
| Anything else | 500 | global `IExceptionHandler` logs the exception with the trace id; body contains no stack trace |

Frontend (Axios response interceptor + per-form handling):
- 400 with field errors → mapped onto Ant Design form fields.
- 401 → clear session, redirect to `/login`.
- 403 → toast "You don't have permission to do that" (or `/forbidden` on navigation).
- 404 → not-found state on the page.
- 409 → toast with the server message; concurrency conflicts offer a "Reload" action.
- 500 / network error → toast with a generic message and the trace id.

## 12. Excel Export

ClosedXML, generated server-side and streamed as
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
Bold frozen header row, auto-fit columns, dates formatted, filename
`assets_yyyyMMdd_HHmm.xlsx` / `users_yyyyMMdd_HHmm.xlsx`. The asset export applies the same
search/filters as the list view but ignores paging. Frontend downloads via blob.

## 13. Seed Data

`DbSeeder` runs on startup when `Seed:DemoData` is true (default) and the database has no users:
- Users: `admin` / `Admin@123` (Admin), `user` / `User@123` (User), plus 4 more normal users
  with password `User@123`.
- ~30 assets across all categories and statuses, about two-thirds assigned.
- Activity-log rows consistent with the seeded state (Created, then Assigned where applicable).
- 5–6 tickets across statuses and priorities.

After seeding, `pg_dump` produces `database/seed.sql` for the submission.

## 14. Configuration

- `appsettings.Development.json` holds a default connection string
  (`Username=postgres;Password=postgres`) and a clearly-labelled dev-only JWT key, so a
  reviewer with default Postgres credentials can run immediately.
- Real local credentials override it through `dotnet user-secrets`
  (`ConnectionStrings:Default`) or the `ConnectionStrings__Default` environment variable.
  Secrets never go in committed files.
- `.gitignore` excludes `bin/`, `obj/`, `node_modules/`, `dist/`, local settings, and the
  confidential assessment PDF.
- Migrations are applied automatically on startup.

## 15. Testing

Backend integration tests (xUnit + `WebApplicationFactory`). Each test class gets its own
throwaway database (`assetmanager_test_<guid>`) on the configured PostgreSQL server, created
by migrations on startup and dropped afterwards, so `ILIKE`, filtered indexes, and `xmin`
behave as in production. No Docker required:

- Auth: valid login returns a token; wrong password and deleted user return 401.
- Authorization: a User token gets 403 on every Admin-only endpoint; no token gets 401.
- Assets: create/read/update/delete happy paths; 400 on invalid input; 409 on duplicate tag;
  409 on stale version; search and filters return the expected rows; deleted assets vanish
  from list, counts, and export.
- Assignment: assign/unassign/reassign write the correct log rows; assigning a retired asset
  and deleting an assigned asset return 409.
- Users: duplicate username 409; deleting a user holding assets 409; admin cannot delete self.
- Tickets: a User sees only their own; a User cannot change status; ResolvedAt is set.
- Export: returns the xlsx content type and a parseable workbook with the expected row count.
- Dashboard: counts match seeded fixtures.

Frontend is verified manually and through the screenshots/demo deliverable.

## 16. Additions From the UI Designs

The Stitch designs in `design/` (tokens in `design/it_asset_manager_enterprise_system/DESIGN.md`,
which match Ant Design defaults) add these small requirements on top of the sections above:

- `User.Department` (optional, ≤ 100) — shown under names and on the assignment card; editable in user forms; exported.
- `Asset.AssignedAt` (UTC, nullable) — "Assigned since" on asset details; set on assign/reassign, cleared on unassign.
- Assign and unassign accept an optional `note` (≤ 500) that is appended to the activity-log details.
  Unassign takes a JSON body (`{}` when there is no note).
- `UserRefDto` carries `id, username, fullName, email, department`.
- Asset list filter `assignedToUserId` (the new-ticket form lists the reporter's own assets).
- Activity log: `search` (asset tag or name) and `GET /api/activity-logs/export` (Admin, .xlsx).
- Activity-log diffs use readable enum names: `Status: In Service → Needs Repair`.
- Tickets: ids start at 1001 (shown as `#1001`); list filters `search` (title, asset tag, or ticket number)
  and `relatedAssetId`; `GET /api/tickets/stats` → `{ all, open, inProgress, resolved, closed, avgResolutionHours }`
  over the tickets the caller can see.
- Dashboard summary adds `addedLast30Days`.
- Out of scope despite appearing in mock-ups: file attachments, "forgot password", SLA/compliance widgets,
  department directory sync, dashboard date-range picker.

## 17. Deliverables Mapping (Part I)

| Brief asks for | Provided by |
|---|---|
| Source code | Git repo / zip of `backend/` + `frontend/` |
| README: setup, features, tech | `README.md` |
| Sample database | `database/seed.sql` + `DbSeeder` |
| Screenshots / demo | `docs/screenshots/` |
| ERD, flow diagram, write-ups | Part II — separate, later |
