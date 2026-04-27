# FormTo.Link — Product Requirements Document (PRD)

| Field | Value |
| --- | --- |
| Product | **FormTo.Link** |
| Domain | https://formto.link |
| Document owner | Product / Engineering |
| Status | Living document |
| Last updated | 2026‑04‑27 |

---

## 1. Overview

FormTo.Link is a **multi‑tenant, collaborative form builder** that lets individuals and teams create beautiful, conversion‑optimized forms, share them via a public link, collect responses, and analyze results — with realtime collaboration, conditional logic, and workspace‑scoped asset management.

### 1.1 Vision

> Make collecting structured information from anyone on the internet as easy as sending a link, while giving teams the power to collaborate on forms in real time and turn responses into decisions.

### 1.2 Mission (next 12 months)

Become the default "shareable form" tool for indie hackers, small teams, and operations / HR / marketing functions inside SMBs — by being faster to set up than Google Forms and cheaper / friendlier than Typeform.

---

## 2. Problem Statement

Existing tools force a tradeoff:

- **Google Forms** is free but ugly, has no real branding/logic, and no real collaboration.
- **Typeform / Tally** look great but are expensive at scale and lack true multi‑user editing.
- **Jotform / Microsoft Forms** are powerful but feel dated and have steep learning curves.

Teams end up duplicating forms in spreadsheets, losing version history, and spamming each other in Slack to coordinate edits.

**FormTo.Link** solves this by combining:
1. A modern, opinionated builder with strong defaults.
2. **Realtime multi‑user editing** out of the box.
3. **Workspace** (organization) ownership with role‑based access.
4. A clean public renderer that converts.

---

## 3. Goals & Non‑Goals

### 3.1 Goals
- Time‑to‑first‑form **< 3 minutes** for a new user.
- Public form load **< 1.5s P95** on 4G.
- Support **20+ field types** including grids, ranking, file upload, and embedded video.
- Realtime collaboration with presence + multi‑cursor on the builder.
- Workspace billing & role‑based access (5 roles).
- Self‑serve only — no sales calls required to onboard.

### 3.2 Non‑Goals (this version)
- Marketplace of community templates.
- Public API for arbitrary 3rd‑party developers (internal API keys exist; public docs deferred).
- Native mobile apps.
- On‑prem / self‑hosted deployments.

---

## 4. Target Users & Personas

| Persona | Description | Primary jobs |
| --- | --- | --- |
| **Indie Iris** | Solo creator / freelancer. | Lead capture, intake forms, RSVPs. |
| **Ops Owen** | Operations or HR generalist at a 20–200 person company. | Onboarding, internal requests, vendor surveys. |
| **Marketing Mei** | Growth/marketer at an SMB. | Landing‑page lead forms, event signups, NPS. |
| **Admin Ada** | Workspace owner managing billing & members. | Invites, role management, audit. |
| **Respondent Ravi** | Anyone receiving a form link. | Fill out form fast on any device. |

---

## 5. User Stories (high‑level)

### Builder
- As a creator, I can drag fields onto a canvas and reorder them.
- As a creator, I can configure validation, options, and properties per field.
- As a creator, I can split a long form into **sections** and **page breaks**.
- As a creator, I can define **conditional logic** (show field B when answer A = X).
- As a creator, I can preview the form exactly as a respondent will see it.

### Collaboration
- As an editor, I can see who else is viewing the form (presence avatars).
- As an editor, I can see other users' cursors and selections in realtime.
- As an editor, I can see who last toggled collaboration mode.

### Distribution
- As a creator, I can publish a form to a public URL `/f/[slug]`.
- As a creator, I can require auth, enable a submission limit, and set start/end windows.
- As a creator, I can generate a QR code for the URL.

### Responses & Analytics
- As a respondent, I can fill the form on mobile/desktop with progress shown.
- As a creator, I can browse responses in a table with filtering & search.
- As a creator, I can export responses to CSV / XLSX / PDF.
- As a creator, I can see chart‑based analytics per field.

### Workspaces & Admin
- As an owner, I can create an organization and invite members by email.
- As an owner, I can assign roles: `owner`, `manager`, `administrator`, `editor`, `viewer`.
- As a member, I can switch between personal and organization workspaces.
- As a superadmin, I can moderate users and organizations from `/admin`.

### Account
- As a user, I can sign up via email/password and verify my email.
- As a user, I can change my email (with verification) and password.
- As a user, I can delete my account; my orgs become `ownerDeletedAt`‑flagged.

---

## 6. Functional Requirements

### 6.1 Authentication
- Email/password via Supabase Auth.
- Email verification + password reset flows.
- OAuth callback route (`/oauth`) to support providers later.
- Cloudflare Turnstile on public submit and (optionally) signup.
- Session managed by `src/proxy.ts` middleware.

### 6.2 Workspaces
- Every user has an implicit **personal workspace**.
- Users may create / belong to **organizations**.
- Forms and assets carry `userId` **xor** `organizationId`.
- **Roles** (`organization_role` enum): `owner`, `manager`, `administrator`, `editor`, `viewer`.
- Email invites with token + `expiresAt`; accept via `/api/accept-invite`.

### 6.3 Form Builder
- 24 field types (`field_type` enum): short/long text, number, email, phone, url, date, time, datetime, select, multi_select, checkbox, radio, rating, scale, file, section, page_break, paragraph, divider, radio_grid, checkbox_grid, video, ranking.
- Per‑field: `label`, `description`, `placeholder`, `required`, `orderIndex`, `options`, `validation`, `properties`, `sectionId`.
- Form‑level: title, slug (unique), description, accent color, status (`draft | active | closed`), `acceptResponses`, `requireAuth`, `showProgress`, `oneResponsePerUser`, `successMessage`, `redirectUrl`, `autoSave`, `collaborationEnabled`, submission limits, schedule windows, sections JSON, logic JSON.

### 6.4 Conditional Logic
- Show/hide rules based on prior field answers.
- Stored in `forms.logic` JSON; evaluated by `src/lib/form-logic.ts`.
- Visual editor at `/forms/[id]/logic`.

### 6.5 Realtime Collaboration
- Liveblocks rooms keyed by form ID.
- Presence avatars on `/forms` list and inside the builder.
- Multi‑cursor / selection sync in builder.
- Auth via `/api/liveblocks-auth`; active users via `/api/liveblocks-active-users`.

### 6.6 Public Form Renderer (`/f/[slug]`)
- Mobile‑first responsive layout.
- Optional auth gate (`requireAuth`).
- Turnstile gate on submit.
- Progress indicator (`showProgress`).
- Honors `acceptResponses`, schedule windows, submission limit, `oneResponsePerUser`.
- After submit: success message and optional `redirectUrl`.

### 6.7 Responses & Analytics
- `form_responses` stores answers JSON + metadata (`timeTaken`, `userAgent`, `ipHash`).
- Table view at `/forms/[id]/results` with filter/search.
- Charts at `/forms/[id]/analytics` (Recharts).
- Exports: CSV (papaparse), XLSX (xlsx), PDF (jspdf + autotable).

### 6.8 Assets
- Per‑workspace media library at `/assets`.
- Stored in Supabase Storage; row in `assets` table with `type` enum (`image | video | document | audio | other`).
- Reusable across forms (image, video field, etc.).

### 6.9 Admin Console (`/admin`)
- Restricted to `userRole = superadmin`.
- Manage users, organizations, system controls.

### 6.10 API Keys
- Hashed key storage (`api_keys` table) with prefix + `lastUsedAt`.
- Public API surface deferred; keys reserved for internal/cron use today.

### 6.11 Marketing Site
- Routes: `/`, `/solutions`, `/pricing`, `/enterprise`, `/resources`, `/resources/[slug]` (form‑builder, analytics, logic‑branching, security, branding, integrations), `/features`, `/about`, `/careers`, `/community`, `/contact`, `/support`.
- SEO: `sitemap.ts`, `robots.ts`, per‑page metadata, OG images.

---

## 7. Non‑Functional Requirements

| Category | Requirement |
| --- | --- |
| **Performance** | P95 public form load < 1.5s on 4G; builder TTI < 3s on cable. |
| **Reliability** | 99.9% monthly uptime (excluding Supabase incidents). |
| **Security** | All write paths behind Supabase RLS; service‑role key server‑only; Turnstile on public submit; sanitized rich text via DOMPurify. |
| **Privacy** | IPs stored as **hashes** only; respondent emails optional. |
| **Accessibility** | WCAG 2.1 AA in builder & renderer (keyboard nav, ARIA, contrast). |
| **Scalability** | Schema indexed for `forms.userId`, `forms.organizationId`, `form_responses.formId+submittedAt`, `assets` lookups. |
| **Browser support** | Latest 2 versions of Chrome, Edge, Safari, Firefox; iOS 16+ Safari; Android Chrome. |
| **Internationalization** | English only at launch; copy structured for future i18n. |
| **Observability** | Server logs + error tracking; cron route for housekeeping under `/api/cron`. |

---

## 8. Data Model (summary)

Source of truth: `src/db/schema.ts`.

- `users` — mirrors Supabase `auth.users`; role: `user | admin | superadmin`.
- `organizations`, `organization_members`, `organization_invites`.
- `forms` — title, slug, status, theming, response controls, schedule, sections, logic.
- `form_fields` — typed fields with `options`, `validation`, `properties` JSON.
- `form_responses` — `answers` JSON + `metadata`.
- `assets` — workspace‑scoped media in Supabase Storage.
- `api_keys` — hashed keys per user.

Enums: `form_status`, `field_type`, `asset_type`, `organization_role`, `user_role`.

---

## 9. Key User Flows

1. **Onboarding** → landing → sign up → verify email → dashboard → "Create form" → builder.
2. **Build & publish** → drag fields → configure logic → preview → status `active` → copy link.
3. **Collect** → respondent opens `/f/[slug]` → Turnstile → submits → success page.
4. **Analyze** → owner opens `/forms/[id]/results` → filter → export CSV/XLSX/PDF.
5. **Collaborate** → invite teammate → they accept → both edit form with presence + cursors.
6. **Workspace switch** → sidebar workspace switcher → forms & assets scope swap.

---

## 10. Pricing (planned)

| Tier | Audience | Highlights |
| --- | --- | --- |
| **Free** | Indie users | Up to 3 active forms, 100 responses/mo, FormTo.Link branding. |
| **Pro** | Solo / freelancer | Unlimited forms, 5k responses/mo, remove branding, exports. |
| **Team** | SMB teams | Organizations, 5 roles, realtime collaboration, 25k responses/mo. |
| **Enterprise** | Custom | SAML SSO (future), custom DPA, volume pricing. |

> Final numbers TBD; gated by Stripe integration (post‑MVP).

---

## 11. Release Plan

| Phase | Scope | Status |
| --- | --- | --- |
| **MVP** | See `MVP.md`. | In progress |
| **v1.0** | Full 24 field types, conditional logic UI, XLSX/PDF export, organizations w/ 5 roles, asset library. | Planned |
| **v1.1** | Webhooks, Zap‑style integrations, advanced analytics. | Planned |
| **v1.2** | Stripe payment fields, custom domains, white‑label. | Backlog |
| **v2.0** | Public API + docs, AI form generation, native mobile shell. | Backlog |

---

## 12. Metrics (KPIs)

- **Activation**: % of new sign‑ups who publish a form within 24h. Target ≥ 40%.
- **Engagement**: Forms with ≥ 1 response within 7 days. Target ≥ 30%.
- **Collaboration**: % of orgs with ≥ 2 simultaneous editors in any week. Target ≥ 25%.
- **Retention**: Week‑4 user retention. Target ≥ 25%.
- **Conversion**: Free → Pro within 30 days. Target ≥ 3%.
- **Reliability**: Uptime ≥ 99.9%; P95 `/f/[slug]` < 1.5s.

---

## 13. Risks & Open Questions

| Risk / Question | Notes |
| --- | --- |
| Next.js 16 churn | New `cacheComponents`, React Compiler — mandate doc consultation per `AGENTS.md`. |
| Liveblocks pricing at scale | Watch MAU / connection costs; pin SDK to `3.18.3` via overrides. |
| Spam / abuse on free tier | Turnstile + per‑form submission limit + IP hash dedupe. |
| GDPR / data residency | Supabase region selection; future EU‑only project for enterprise. |
| When to ship public API? | Gated behind `api_keys` infra readiness + docs site. |
| Pricing experimentation | A/B on `/pricing` after first 1k MAU. |

---

## 14. References

- Codebase entry points: `src/app/(marketing)/page.tsx`, `src/app/(app)/forms`, `src/app/(admin)/admin`.
- DB schema: `src/db/schema.ts`.
- Logic engine: `src/lib/form-logic.ts`.
- Middleware/auth: `src/proxy.ts`.
- Build config: `next.config.ts`, `drizzle.config.ts`.
- Companion docs: `README.md`, `MVP.md`, `AGENTS.md`.
