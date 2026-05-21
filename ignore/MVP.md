# FormTo.Link — MVP

> The minimum set of capabilities required for FormTo.Link to be useful, shippable, and monetizable.

## 1. Purpose

Let an individual or a small team **build a form, share a link, collect responses, and review results** — without writing code, and without leaving the product.

## 2. Target MVP User

- **Solo creator / small business owner** collecting leads, RSVPs, feedback, or order requests.
- **Small team (2–10)** that wants more than one person to edit the same form.

Out of scope for MVP: enterprise SSO, custom domains, full marketplace of integrations.

## 3. MVP Scope

### 3.1 Must Have (P0)

| Area | MVP Requirement |
| --- | --- |
| **Auth** | Email/password sign‑up & login (Supabase Auth), email verification, password reset. |
| **Workspace** | Personal workspace by default. Ability to create **one** organization and invite members by email. Roles: `owner`, `editor`, `viewer`. |
| **Form builder** | Create / rename / duplicate / delete forms. Drag‑and‑drop fields. Required field toggle. Per‑field label, description, placeholder. |
| **Field types (core 10)** | short_text, long_text, email, number, phone, url, select, multi_select, checkbox, radio. |
| **Form settings** | Title, description, accent color, success message, accept‑responses toggle, draft / active / closed status. |
| **Sharing** | Public URL `/f/[slug]`. Copy‑to‑clipboard. Cloudflare Turnstile on submit. |
| **Submissions** | Anonymous response collection. Per‑form response list with timestamps. |
| **Results** | Tabular view of responses + **CSV export**. |
| **Realtime** | At minimum, **presence** (who's viewing/editing) on the builder via Liveblocks. |
| **Account** | Profile (name, avatar), change email, change password, delete account. |
| **Legal/SEO** | Marketing landing page, pricing page, sitemap, robots, basic metadata. |

### 3.2 Should Have (P1, included if time permits)

- Long_text + date + rating + file upload field types.
- Conditional logic (show/hide based on a single previous answer).
- XLSX & PDF export.
- Form duplication into another workspace.
- QR code for the public URL.
- Submission limit (fixed cap) and open/close window (`startsAt` / `endsAt`).
- Sections + page breaks.

### 3.3 Won't Have (deferred post‑MVP)

- Custom domains / white‑label.
- Multiple organizations per user with rich role matrix (`manager`, `administrator`).
- API keys & public API.
- Webhooks / Zapier / native integrations.
- Stripe payments inside forms.
- A/B testing & funnel analytics.
- AI form generation.
- SOC2 / SAML SSO / audit logs.
- Mobile native apps.

## 4. MVP Success Criteria

The MVP ships when **all** of the following are true:

1. A new visitor can sign up, verify their email, and create a form in **< 3 minutes**.
2. The form's public link works on desktop and mobile, behind Turnstile, with no console errors.
3. Submissions appear in the owner's results page within **2 seconds** of submission.
4. Two members of the same organization can edit a form simultaneously without losing data.
5. A response set can be exported to CSV that opens cleanly in Excel/Sheets.
6. P95 page load on `/f/[slug]` is **< 1.5s** on 4G.
7. Zero P0 bugs in the last 7 days of internal dogfooding.

## 5. MVP Non‑Goals (Explicitly)

- Pixel‑perfect parity with Typeform / Google Forms.
- Localization beyond English.
- On‑prem deployment.
- Offline mode for the builder.

## 6. MVP Tech Choices (locked)

- Next.js 16 (App Router) + React 19, TypeScript.
- Supabase (Postgres + Auth + Storage).
- Drizzle ORM.
- Liveblocks for presence/collab.
- Resend for transactional email.
- Cloudflare Turnstile for bot protection.
- Tailwind v4 + shadcn/ui.

## 7. MVP Milestones

| Week | Deliverable |
| --- | --- |
| 1 | Auth, workspace shell, DB schema, marketing landing. |
| 2 | Form builder (10 core fields), draft/save, public renderer. |
| 3 | Submissions, results table, CSV export, Turnstile. |
| 4 | Organizations + invites, presence in builder, settings, polish. |
| 5 | Bugbash, perf pass, SEO, launch. |

## 8. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Next.js 16 API drift breaks builds. | Pin version, follow `AGENTS.md` rule of consulting `node_modules/next/dist/docs/`. |
| Liveblocks complexity slows MVP. | Ship **presence only** for MVP; defer multi‑cursor edit conflict logic. |
| Supabase RLS gaps leak responses. | Cover with explicit RLS policies in `sqls/` and a manual audit before launch. |
| Spam submissions. | Turnstile on every public form + IP hashing in `form_responses.metadata`. |
