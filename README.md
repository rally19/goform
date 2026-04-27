# FormTo.Link

> Modern form builder for teams — create beautiful, conversion‑optimized forms in minutes.

FormTo.Link is a multi‑tenant SaaS form builder with realtime collaboration, conditional logic, analytics, asset management, and organization‑based workspaces. Production domain: **https://formto.link**.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js **16.2** (App Router, React Compiler, `cacheComponents`) |
| Runtime | React **19.2** |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4, `tw-animate-css`, `next-themes` (dark mode) |
| UI primitives | Radix UI, shadcn/ui, Lucide & Simple Icons, `cmdk`, Sonner |
| Animation | Motion (Framer Motion v12) |
| Forms | React Hook Form + Zod (`@hookform/resolvers`) |
| State | Zustand, Immer, TanStack Query v5 |
| Drag & drop | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/react` |
| Rich text | Tiptap v3 (+ image, placeholder, text‑align, text‑style) |
| Realtime collab | Liveblocks (`@liveblocks/client`, `react`, `node`, `react-tiptap`, `react-ui`) |
| Database | PostgreSQL (Supabase) via Drizzle ORM v0.45 + `postgres` driver |
| Auth & storage | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Email | Resend |
| Bot protection | Cloudflare Turnstile (`@marsidev/react-turnstile`) |
| Local cache | Dexie (IndexedDB) |
| Charts | Recharts v3 |
| Exports | `xlsx`, `papaparse`, `jspdf`, `jspdf-autotable` |
| QR codes | `qr-code-styling` |
| Sanitization | DOMPurify |

---

## Project Structure

```
src/
├─ app/
│  ├─ (marketing)/          Public site: landing, pricing, features, solutions,
│  │                        enterprise, resources, about, careers, community,
│  │                        contact, support
│  ├─ (auth)/               login, register, forgot-password, reset-password,
│  │                        verify, auth-code-error, server actions
│  ├─ (app)/                Authenticated app shell
│  │   ├─ dashboard/
│  │   ├─ forms/            list + [id]/{edit,logic,analytics,results,settings}
│  │   ├─ organizations/    list + [id] detail (members, invites, settings)
│  │   ├─ assets/           media library
│  │   └─ settings/         account, profile, email change, billing
│  ├─ (admin)/admin/        Superadmin: users, organizations, system controls
│  ├─ api/                  accept-invite, admin, auth, cron,
│  │                        liveblocks-auth, liveblocks-active-users, test-db
│  ├─ f/[slug]/             Public form rendering & submission
│  ├─ preview/              Form preview mode
│  ├─ oauth/                OAuth callback
│  ├─ sitemap.ts, robots.ts
│  ├─ forbidden.tsx, unauthorized.tsx
│  └─ layout.tsx, globals.css
├─ components/
│  ├─ form-builder/         Field editors, canvas, toolbox
│  ├─ form-logic/           Conditional logic UI
│  ├─ form-renderer/        Public form runtime
│  ├─ ui/                   shadcn/ui primitives
│  ├─ layout/               app shell parts
│  └─ app-sidebar, workspace-switcher, user-account-widget,
│     theme-provider, theme-toggle, organization-observer
├─ lib/
│  ├─ actions/              Server actions (forms, responses, orgs, auth, assets…)
│  ├─ form-logic.ts         Conditional branching engine
│  ├─ form-types.ts         Field/form type definitions
│  ├─ client.ts, server.ts  Supabase clients (browser + SSR)
│  ├─ supabase-admin.ts     Service-role client
│  ├─ db.ts                 Drizzle connection
│  ├─ admin-procedure.ts    Admin auth guard
│  ├─ resend.ts, liveblocks.ts, sanitize.ts, utils.ts, constants.ts
├─ hooks/                   use-form-builder, use-form-collaboration,
│                           use-forms-list-presence, …
├─ db/
│  ├─ schema.ts             Drizzle schema (users, orgs, forms, fields,
│  │                        responses, assets, api_keys, invites)
│  └─ index.ts
└─ proxy.ts                 Next.js middleware (auth/session)

drizzle/                    Generated migrations + snapshots
sqls/                       Hand-written SQL change scripts (RLS, etc.)
supabase_sql_changes_put_here/  Pending SQL to apply to Supabase
supabase/migrations/        Supabase CLI migrations
scripts/                    check-db, check-deps, check-port, migrate
public/                     Static SVGs / icons
```

---

## Core Features

### Form Building
- 24 field types: short/long text, number, email, phone, URL, date, time, datetime, select, multi‑select, checkbox, radio, rating, scale, file upload, ranking, video embed, paragraph, divider, section, page break, radio grid, checkbox grid.
- Drag‑and‑drop builder powered by `@dnd-kit`.
- Per‑field validation (min/max, length, pattern, step) and properties (rows, scale labels, file limits, video source, aspect ratio…).
- Sections, page breaks, and an accent‑color theme per form.

### Conditional Logic
- Visual rule editor (`src/components/form-logic`).
- Engine in `src/lib/form-logic.ts` for show/hide and branching.

### Realtime Collaboration
- Multi‑cursor editing of forms via Liveblocks.
- Active‑user presence on forms list and inside the builder.
- Liveblocks auth in `src/app/api/liveblocks-auth`.

### Responses & Analytics
- Response collection with metadata (time taken, UA, IP hash).
- Results page with charts (Recharts).
- Export to **CSV** (`papaparse`), **XLSX** (`xlsx`), and **PDF** (`jspdf` + autotable).
- Submission limits (fixed or decremental), open/close windows, one‑per‑user, auth‑required, accept‑responses toggle.

### Forms Distribution
- Public route `/f/[slug]` with optional auth gate and Turnstile bot protection.
- QR code generation (`qr-code-styling`).
- Custom success message and redirect URL.

### Organizations / Workspaces
- Multi‑tenant: forms and assets belong to a user **or** an organization.
- Roles: `owner`, `manager`, `administrator`, `editor`, `viewer`.
- Email invitations with token + expiry; accept‑invite API route.
- Workspace switcher in the sidebar.

### Assets
- Per‑user / per‑org media library backed by Supabase Storage.
- Types: image, video, document, audio, other.
- Reusable in form fields (e.g. video embed, images).

### Authentication
- Supabase Auth with email/password + OAuth callback.
- Email verification, password reset, email‑change verification flow.
- Server actions in `src/app/(auth)/actions.ts`.
- Cloudflare Turnstile on public forms.

### Admin Console (`/admin`)
- Superadmin role gate (`userRoleEnum`: user / admin / superadmin).
- Manage users, organizations, and system settings.

### API Keys
- Hashed key storage (`api_keys` table) with prefix + last‑used tracking.

### Marketing Site
- Landing, **Solutions**, **Pricing**, **Enterprise**, **Resources** (with detail pages: form‑builder, analytics, logic‑branching, security, branding, integrations), **Features**, **About**, **Careers**, **Community**, **Contact**, **Support**.
- SEO: `sitemap.ts`, `robots.ts`, per‑page metadata.

---

## Database (Drizzle / Postgres)

Tables defined in `src/db/schema.ts`:

- `users` — mirrors `auth.users` with role, name, avatar, verified‑at.
- `organizations` + `organization_members` + `organization_invites`.
- `forms` — title, slug, status (draft/active/closed), theming, response controls, schedule windows, sections, logic JSON, collaboration flag.
- `form_fields` — typed fields with options/validation/properties JSON.
- `form_responses` — answers JSON + metadata.
- `assets` — workspace‑scoped media with storage path.
- `api_keys` — hashed keys per user.

Enums: `form_status`, `field_type`, `asset_type`, `organization_role`, `user_role`.

Migrations live in `drizzle/`; ad‑hoc SQL changes (RLS, policies) in `sqls/` and `supabase_sql_changes_put_here/`.

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- A Supabase project (Postgres + Auth + Storage)
- A Liveblocks account
- A Resend account (transactional email)
- A Cloudflare Turnstile site key

### Install
```bash
npm install
```

### Environment variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Drizzle / Postgres (Supabase pooled connection string)
DATABASE_URL=

# Liveblocks
LIVEBLOCKS_SECRET_KEY=
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=

# Resend
RESEND_API_KEY=

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database setup
```bash
# Generate / apply Drizzle migrations
npx drizzle-kit generate
npx drizzle-kit migrate
# or use the helper
node scripts/migrate.js
```

Apply any pending SQL files in `supabase_sql_changes_put_here/` and policies in `sqls/` via the Supabase SQL editor.

### Develop
```bash
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run lint
```

---

## Notable Implementation Notes

- **Next.js 16** with `reactCompiler: true` and `cacheComponents: true` (see `next.config.ts`). Treat APIs and conventions as potentially different from older Next.js — consult `node_modules/next/dist/docs/` before changing framework code (per `AGENTS.md`).
- **Server actions** body limit raised to 5 MB.
- **Optimized package imports**: `lucide-react`, `framer-motion`, `recharts`, `simple-icons`.
- **Auth & session** are handled in `src/proxy.ts` (Next.js middleware).
- **Liveblocks override** pinned to `3.18.3` via `package.json` `overrides`.
- **HTML sanitization** via `src/lib/sanitize.ts` (DOMPurify) for any user‑authored rich text rendered to other users.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run built app |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `node scripts/migrate.js` | Run DB migrations |
| `tsx scripts/check-db.ts` | Verify DB connectivity |
| `tsx scripts/check-port.ts` | Check dev port availability |

---

## License

Private / proprietary. All rights reserved.

