# ClientDesk

A client portal for small agencies. Agency owners sign up and create their agency, invite their team and their clients by email, and run every client relationship from one place:

- **Team members** create projects for clients, share deliverable files for review, and send invoices.
- **Clients** log in to see their projects, download files, approve deliverables (or request changes), and pay invoices by card with Stripe.
- **The dashboard** shows collected revenue by month, outstanding and overdue balances, project status, deliverables in review, and recent activity.

Built with Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS 4, Prisma 6 + PostgreSQL, and Stripe Checkout.

## Quick start

Requirements: Node 20+ and PostgreSQL 14+.

```bash
cp .env.example .env          # then edit DATABASE_URL
npm install
npx prisma migrate deploy     # create the schema
npm run db:seed               # optional: demo agency with a year of data
npm run dev                   # http://localhost:3000
```

Demo logins (after seeding), password `password123` for all:

| Email | Role |
| --- | --- |
| `owner@northwind.test` | Agency owner |
| `sam@northwind.test` | Team member |
| `jordan@acme.test` | Client (Acme Inc.) |

## Roles and permissions

| | Owner | Team member | Client |
| --- | :-: | :-: | :-: |
| Dashboard (revenue, status) | ✓ | ✓ | Own overview |
| Clients: add, edit, invite contacts | ✓ | ✓ | — |
| Projects & deliverables: create, upload | ✓ | ✓ | View own |
| Approve / request changes | — | — | ✓ |
| Invoices: create, send, record payment, void | ✓ | ✓ | View & pay own |
| Invite / remove team members | ✓ | — | — |
| Agency settings, currency, Stripe | ✓ | — | — |
| Delete a client | ✓ | — | — |

Every query for tenant data goes through scope helpers in `src/lib/dal.ts`, so team members only ever see their agency and clients only ever see their own company's projects, files and (non-draft) invoices. A user can belong to several agencies and switch between them from the user menu.

## Configuration

All configuration is via environment variables (see `.env.example`).

### Email

Set `SMTP_URL` (any nodemailer SMTP URL, e.g. Postmark, Resend, SES) and `EMAIL_FROM`. Emails go out for invitations, invoices sent, deliverables ready for review, review decisions, and payments received.

Without `SMTP_URL`, emails are printed to the server console, and invite forms show a copyable invite link so you can still onboard people.

### Stripe payments

1. Set `STRIPE_SECRET_KEY`.
2. Create a webhook endpoint pointing at `https://<your-app>/api/webhooks/stripe` subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded` (plus `account.updated` in Connect mode), and set `STRIPE_WEBHOOK_SECRET`.
   For local development: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

Clients then see a **Pay** button on open invoices. Payment is confirmed both by the webhook and when the client returns from Checkout; settlement is idempotent.

There are two payment modes:

- `STRIPE_CONNECT_ENABLED=false` (default): payments go to the Stripe account that owns the key. Use this when a single agency runs its own copy of ClientDesk.
- `STRIPE_CONNECT_ENABLED=true`: multi-tenant mode. Each agency owner connects a Stripe Express account under **Settings → Online payments**, and payments are routed to it with destination charges. Enable Connect on your platform account, and make sure the webhook also receives events from connected accounts so `account.updated` arrives.

Payments received outside Stripe (bank transfer, check, cash) can be recorded from the invoice page.

### File storage

Deliverable files are stored on local disk under `UPLOAD_DIR` (default `./storage/uploads`) and are only served through `/api/files/:id`, which checks the viewer's access on every request. Files that could run script in the browser (HTML, SVG, …) are always served as downloads. `MAX_UPLOAD_MB` caps the size per file (default 50).

On platforms without a persistent disk (e.g. serverless), swap `src/lib/storage.ts` for an S3-compatible driver: callers only use `putObject`, `getObject` and `removeObject`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm test` | Unit tests (Vitest) |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Load demo data |

## Project layout

```
prisma/               schema, migrations, demo seed
src/proxy.ts          optimistic auth redirect for portal routes
src/app/(auth)/       login, signup, invitation acceptance, onboarding
src/app/(portal)/     dashboard, clients, projects, invoices, team, settings
src/app/actions/      server actions (all mutations)
src/app/api/          file upload/download, Stripe webhook
src/components/       UI kit (ui/), dashboard charts, shared views
src/lib/              data access layer, sessions, money, mail, storage, Stripe
```

## Security notes

- Passwords are hashed with bcrypt; sessions are random 256-bit tokens stored as SHA-256 hashes, sent in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production). Changing your password signs out other sessions.
- Invitations are single-use, email-bound, expire after 14 days, and are stored hashed.
- Login redirects only follow same-origin paths.
- Not yet included: rate limiting on login and invite endpoints, and password reset by email. Add these before exposing the app publicly.
