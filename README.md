# IT Asset Manager

A web tool for an IT team to track company assets: who holds what, what state each asset is in,
what needs repair, and the IT support tickets raised against them.

- **Frontend:** React 19 + TypeScript (Vite), Tailwind CSS — `frontend/`
- **Backend:** ASP.NET Core Web API on .NET 10 (C#) — `backend/`
- **Database:** PostgreSQL 18 — sample data in `database/seed.sql`
- **Design spec:** [`docs/design-spec.md`](docs/design-spec.md) · **Screenshots:** [`docs/screenshots/`](docs/screenshots/)

**Contents:** [Completed features](#completed-features) · [Setup guide](#setup-guide) ·
[Tools and technologies](#tools-and-technologies) · [Running the tests](#running-the-tests) ·
[Project structure](#project-structure)

**Assessment Part II** (error handling strategy, features not implemented, debugging scenario):
[`docs/part-ii-practical-understanding.md`](docs/part-ii-practical-understanding.md)

## Completed features

All must-have, nice-to-have and extra-challenge features from the brief are implemented.

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

## Setup guide

The system needs **PostgreSQL** plus the **API** (.NET) and the **web app** (React). You do not need to
create the database or tables by hand: on first start the API creates the `assetmanager` database,
applies the migrations and loads demo data.

There are two ways to run it:

- **[Just run the app](#7-optional-run-everything-from-one-terminal)** — build the web app once, then a
  single `dotnet run` serves everything at http://localhost:5080. One terminal, same on any OS.
- **[Develop the app](#4-start-the-api-terminal-1)** (steps 4–5 below) — API and web app in two
  terminals, with instant refresh when you edit frontend code.

Steps 1–3 are needed either way.

### 1. Install the prerequisites

| Tool | Version | Download | Check with |
|---|---|---|---|
| .NET SDK | 10.0 | https://dotnet.microsoft.com/download/dotnet/10.0 | `dotnet --version` → `10.x` |
| Node.js | 22 LTS or newer | https://nodejs.org | `node --version` |
| PostgreSQL | 16 or newer (built on 18) | https://www.postgresql.org/download/ | pgAdmin, or `psql --version` |
| Git | any | https://git-scm.com | `git --version` |

When installing PostgreSQL, keep the default port **5432** and **write down the password you choose for
the `postgres` user**, as step 3 needs it. The installer registers PostgreSQL as a Windows service, so it
starts automatically with the machine.

> After installing the .NET SDK or Node.js, open a **new** terminal so the `dotnet` / `node` commands are found.

### 2. Get the code

```bash
git clone https://github.com/Jessechuo/sophicinterview.git
cd sophicinterview
```

### 3. Tell the API your PostgreSQL password

The API connects as `postgres` to `localhost:5432`. Pick **one** option:

- **Your password is `postgres`:** nothing to do. This is the default in
  `backend/AssetManager.Api/appsettings.Development.json`.
- **Any other password (recommended way):** store it with .NET user-secrets, which keeps it outside the
  repository:

  ```bash
  cd backend/AssetManager.Api
  dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Port=5432;Database=assetmanager;Username=postgres;Password=YOUR_PASSWORD"
  ```

- **Quick alternative:** replace `Password=postgres` in `appsettings.Development.json` with your password
  (don't commit that change).

### 4. Start the API (terminal 1)

```bash
cd backend/AssetManager.Api
dotnet run
```

Wait for `Now listening on: http://localhost:5080`. The first start takes a little longer while it
creates the database and seeds **6 users, 30 assets, 6 tickets** and their activity history.
Leave this terminal open. Interactive API docs (Swagger UI) are at http://localhost:5080/swagger.

### 5. Start the web app (terminal 2)

```bash
cd frontend
npm install        # first time only
npm run dev
```

Open **http://localhost:5173**. In development the web app forwards every `/api` call to the API on
port 5080, so no extra configuration is needed.

### 6. Sign in

| Username | Password | Role | What they can do |
|---|---|---|---|
| `admin` | `Admin@123` | Admin | Everything: assets, assignment, users, activity log, all tickets, exports |
| `user` | `User@123` | User (Siti Aminah) | View assets and the dashboard, submit and track their own tickets |
| `weijie`, `priya`, `farid`, `meiling` | `User@123` | User | Same as `user` |

### 7. Optional: run everything from one terminal

The API can serve the built web app itself, so one process and one command runs the whole system —
the same way it would be deployed. Build once:

```bash
cd frontend
npm install        # first time only
npm run build:api  # builds the web app into the API's wwwroot folder
```

Then, from then on, only this:

```bash
cd backend/AssetManager.Api
dotnet run
```

Open **http://localhost:5080** — the app and the API are both served there, and there is no second
terminal and no port 5173. Re-run `npm run build:api` after changing frontend code, since this mode
serves the built files rather than watching them.

### Optional: load the sample database from SQL

`database/seed.sql` is a `pg_dump` of the seeded database. To use it instead of the automatic seeding,
restore it into an empty database **before** the API's first start:

```bash
createdb -U postgres assetmanager
psql -U postgres -d assetmanager -f database/seed.sql
```

On Windows these tools live in `C:\Program Files\PostgreSQL\<version>\bin\`. The API then sees the
migrations are already applied and the data already exists, and skips seeding.

### Reset the demo data

Stop the API (`Ctrl+C`), then from the repository root:

```bash
dotnet tool restore
dotnet ef database drop --force --project backend/AssetManager.Api
```

Start the API again and it rebuilds and reseeds the database.

### Troubleshooting

| Problem | Fix |
|---|---|
| API stops with `Failed to connect to 127.0.0.1:5432` | PostgreSQL isn't running. Start the `postgresql-x64-<version>` service (Windows **Services**), or open pgAdmin to check the server is up. |
| API stops with `password authentication failed for user "postgres"` | The password from step 3 doesn't match. Set it again. |
| Login shows *"The requested record was not found"* or a network error | The API isn't running, or the web app started before its config was in place. Check terminal 1, then stop terminal 2 (`Ctrl+C`) and run `npm run dev` again. |
| `Failed to bind to address … address already in use` | Another copy is already running. Close it, or change the port in `backend/AssetManager.Api/Properties/launchSettings.json` (API) or `frontend/vite.config.ts` (web app and its `/api` proxy target). |
| `'dotnet' / 'npm' is not recognized` | Open a new terminal after installing, or reinstall with *Add to PATH* ticked. |
| `dotnet test` fails with *file is locked by AssetManager.Api* | Stop the running API first; it locks the build output the tests need. |

## Tools and technologies

| Layer | Tools |
|---|---|
| Backend | C# / **ASP.NET Core Web API on .NET 10**, Entity Framework Core 10 with **Npgsql** (PostgreSQL provider, code-first migrations), JWT bearer authentication, BCrypt.Net-Next (password hashing), **ClosedXML** (Excel `.xlsx` export), Swagger UI (API docs) |
| Database | **PostgreSQL 18** (16+ supported), managed with pgAdmin |
| Frontend | **React 19** + **TypeScript 6**, **Vite 8**, React Router 8, TanStack Query 5 (server state and caching), Axios, **Tailwind CSS 3**, Material Symbols icons, Inter font. The dashboard charts are hand-built SVG, with no chart library. |
| Testing and quality | **xUnit** + `WebApplicationFactory` integration tests against a real PostgreSQL database, oxlint (frontend linting), strict TypeScript checks |
| Design | Google Stitch (UI mock-ups), ported to the app's Tailwind theme |
| Workflow | Git + GitHub, Visual Studio Code |

## Running the tests

```bash
dotnet test backend/AssetManager.slnx
```

106 integration tests run the real API against a throwaway PostgreSQL database per test class
(created from migrations, dropped afterwards). They cover authentication, the full role matrix
(401/403 on every endpoint), validation, conflicts, concurrency, assignment rules, activity logging,
exports, dashboard counts, users, tickets, seeding and CORS. PostgreSQL must be running. The tests take
the server and password from user-secrets (step 3) or the `ConnectionStrings__Default` environment
variable, falling back to `postgres` / `postgres`. They don't read `appsettings.Development.json`, so if
you used the quick alternative in step 3, set user-secrets as well.

The frontend is type-checked and linted with `npm run build` and `npm run lint` (run inside
`frontend/`), and was verified end-to-end in a browser as both roles (screenshots in `docs/screenshots/`).

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
docs/                      design spec, screenshots, assessment Part II write-up
```

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
