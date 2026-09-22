# IT Asset Manager

A web tool for an IT team to track company assets: who holds what, what state each asset is in,
what needs repair, and the IT support tickets raised against them.

- **Frontend:** React 19 + TypeScript (Vite), Tailwind CSS — `frontend/`
- **Backend:** ASP.NET Core Web API on .NET 10 (C#) — `backend/`
- **Database:** PostgreSQL 18 — sample data in `database/seed.sql`
- **Design spec:** [`docs/design-spec.md`](docs/design-spec.md) · **Screenshots:** [`docs/screenshots/`](docs/screenshots/)

## Features

| Area | What's included |
|---|---|
| Authentication | JWT login with two fixed roles (**Admin**, **User**); "remember me"; session-expiry handling; role-based navigation and route guards; every API endpoint enforces the role server-side |
| Assets | Paged, sortable list; search across tag, name, brand, model, serial, location and assignee; filters by status, category and assignment; details page; create / edit / delete (soft delete) with confirmation; optimistic-concurrency protection on edit; auto-saved draft for new assets |
| Assignment | Assign, reassign and unassign with optional notes; retired assets can't be assigned; assigned assets can't be retired or deleted until unassigned |
| Excel export | Asset list, user list and activity log to `.xlsx` (respects the current filters) |
| Dashboard | Totals, assigned vs unassigned donut, assets by status and by category, items needing attention |
| User management *(nice-to-have)* | User CRUD, role assignment, department, "has assets" filter, export; admins can't delete or demote themselves; users holding assets can't be deleted |
| Activity log *(nice-to-have)* | Every Create / Update (with field-level diff) / Delete / Assign / Unassign is recorded in the same transaction as the change; filter by action, date range and asset; per-asset timeline |
| IT tickets *(extra challenge)* | Users submit tickets (optionally linked to their own assets) and see only their own; admins see all, change status, add resolution notes; status counts, average resolution time and resolution rate |

## Running locally

**Prerequisites:** .NET 10 SDK, Node.js 22+, PostgreSQL 16+ running on `localhost:5432`.

```bash
# 1. API (applies migrations and seeds demo data on first start)
cd backend/AssetManager.Api
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Port=5432;Database=assetmanager;Username=postgres;Password=<your password>"
dotnet run                      # http://localhost:5080  (Swagger UI: /swagger)

# 2. Frontend (in a second terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173  (proxies /api to :5080)
```

If your Postgres user is `postgres` / `postgres`, step 1's `user-secrets` line is optional — that is the
development default in `appsettings.Development.json`.

**Alternative to seeding:** restore `database/seed.sql` into an empty database with
`psql -U postgres -d assetmanager -f database/seed.sql`.

### Demo accounts

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin@123` | Admin |
| `user` | `User@123` | User (Siti Aminah) |
| `weijie`, `priya`, `farid`, `meiling` | `User@123` | User |

### Tests

```bash
dotnet test backend/AssetManager.slnx
```

106 integration tests run the real API against a throwaway PostgreSQL database per test class
(created from migrations, dropped afterwards). They cover authentication, the full role matrix
(401/403 on every endpoint), validation, conflicts, concurrency, assignment rules, activity logging,
exports, dashboard counts, users, tickets, seeding and CORS.

The frontend is type-checked and linted with `npm run build` and `npm run lint`, and was verified
end-to-end in a browser (screenshots in `docs/screenshots/`).

## Project structure

```
backend/
  AssetManager.Api/        Controllers → Services (business rules) → EF Core DbContext → PostgreSQL
    Entities/  Dtos/  Services/  Controllers/  Data/ (DbContext, migrations, seeder)
    Infrastructure/        errors → ProblemDetails, JWT auth, paging, Excel export
  AssetManager.Tests/      xUnit + WebApplicationFactory integration tests
frontend/
  src/api/                 typed API client and DTO types
  src/auth/                session handling and route guards
  src/components/          app shell and shared UI (tables, tags, modal, toast, pagination…)
  src/pages/               one folder/file per screen
database/seed.sql          pg_dump of the seeded demo database
docs/                      design spec and screenshots
```

## Error handling (summary)

- **Invalid input:** the forms validate before submitting; the API re-validates every request and returns
  `400` ValidationProblemDetails with per-field messages, which the forms show under each field.
- **Asset update errors:** missing record → `404`; duplicate tag/serial/username/email → `409` with the
  field named; editing an asset someone else just changed → `409` and the form reloads the latest version;
  rule violations (e.g. deleting an assigned asset) → `409` with an explanatory message shown as a toast.
- **Unauthorized access:** no/expired token → `401` and the app returns to the login page;
  wrong role → `403` (the UI also hides admin-only actions and redirects admin-only pages to a 403 screen).
- **Unexpected errors:** a global exception handler logs the error and returns a generic `500`
  ProblemDetails with a trace id — never a stack trace.

## Deployment notes

- **Frontend → Vercel:** set the project root to `frontend/`; `vercel.json` provides the SPA fallback.
  Set `VITE_API_BASE_URL` to the API's public URL.
- **API → a .NET-capable host** (e.g. Render, Railway, Azure App Service) with a hosted PostgreSQL
  (e.g. Neon). Configure `ConnectionStrings__Default`, `Jwt__Key` (32+ characters) and
  `Cors__AllowedOrigins__0=<your Vercel URL>`. Migrations run automatically on startup.

## Design notes and deviations

The UI is ported from Google Stitch mock-ups using their own Tailwind token set. Where a mock-up showed
data the system doesn't have, the space shows real figures instead of invented ones:
SLA compliance → resolution rate; "2FA on" → departments; integrity/retention badges → entry count and
latest entry; warranty/IP/MAC and compliance widgets → registration date, notes and a service summary;
the file-attachment dropzone and "forgot password" email flow are not implemented (the link explains
that resets go through an administrator). Photos in the mock-ups are replaced by initials avatars.
