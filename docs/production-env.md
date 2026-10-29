# Production environment checklist (Render + Neon)

Every variable below is read by `server/src/utils/env.config.ts`, which throws on
a missing required one — the service refuses to boot rather than start half-wired.
Set them in Render → your service → **Environment**, then **Apply & Restart**.
Treat secrets as "Secret text"; the rest can be plain values.

## Required — the app will not start without these

| Variable | Shape | Why it exists | Verify after deploy |
| --- | --- | --- | --- |
| `PORT` | number | Express listen port | Render injects `$PORT`; leave the default. |
| `NODE_ENV` | `production` | Turns on secure cookies, `trust proxy`, SPA static serving, and the storage guard | `GET /api/health` → `{"ok":true}` |
| `DATABASE_URL` | `postgresql://…` | Neon Postgres connection string (production branch) | Boot log `==> database: connected` |
| `CORS_ORIGIN` | `https://bicats-prototype.onrender.com` | Allowed cross-origin `fetch` with credentials | Login POST is not blocked by CORS |
| `JWT_SECRET` | long random string | Signs access tokens | Rotate → all sessions invalidate |
| `JWT_EXPIRES_IN` | `900` (seconds = 15 min) | Access token lifetime | 401 + silent refresh keeps you logged in |
| `CSRF_SECRET` | long random string | Double-submit CSRF signing | `GET /api/csrf-token` returns a token; a write request succeeds |
| `AWS_ACCESS_KEY_ID` | Neon branch credential | S3 write/read identity | — |
| `AWS_SECRET_ACCESS_KEY` | Neon branch credential | S3 write/read identity | — |
| `AWS_ENDPOINT_URL_S3` | copy the value verbatim | Branch-scoped S3 endpoint — do not hand-write a URL | `GET /api/assets/<key>` streams an upload |
| `AWS_REGION` | e.g. `ap-southeast-1` | The S3 client has no region of its own and throws without it | first evidence upload succeeds |
| `STORAGE_BUCKET` | `assets` | Bucket name from `neon.ts` (defaults to `assets`) | — |

The last five are the object-storage set. In production the server hard-fails at
startup if `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` or `AWS_ENDPOINT_URL_S3`
are absent: Render's disk is wiped on every deploy, so `server/uploads/` would
silently swallow complaint evidence. `neon env pull` writes the four `AWS_*`
values for the checked-out branch — copy them into Render rather than committing
an env file.

## Optional — blank means "feature off", never a crash

| Variable | Default | Effect |
| --- | --- | --- |
| `REFRESH_TOKEN_EXPIRES_IN` | `30` (days) | How long a "remember me" session lasts |
| `UNISMS_SECRET_KEY` | empty → SMS never sent | UniSMS provider key |
| `UNISMS_SENDER_ID` | `Unisoft` | SMS sender label |
| `UNISMS_API_URL` | `https://unismsapi.com/api/sms` | SMS endpoint |
| `BREVO_API_KEY` | empty → email never sent | Brevo transactional key |
| `BREVO_SENDER_EMAIL` | empty | From-address on complainant notices |
| `BREVO_SENDER_NAME` | `BICATS` | From-name |
| `BREVO_API_URL` | `https://api.brevo.com/v3/smtp/email` | Email endpoint |

A blank key disables the channel: sends are skipped and nothing is written to the
audit log at all, so confirm the enabled state after deploy with
`GET /api/settings/channels` (returns `{ sms, email }`), which the Settings
notifications tab also reads.

## Uploads in production — what "working" looks like

- Accepted: JPG, PNG, WEBP (logo/signatures, ≤ 2 MB) and JPG, PNG, PDF, MP4
  (complaint evidence, ≤ 10 MB each, max 5 per filing).
- Objects are stored under a random UUID key with the extension taken from the
  MIME type, never from the filename the complainant uploaded.
- The bucket is **private**, so files are streamed through
  `GET /api/assets/:key`, which 404s any key that is not
  `<uuid>.<jpg|png|webp|pdf|mp4>`. Responses are `immutable` — keys never change
  content, so a stale browser copy is not a support case.

## Smoke test after each deploy

1. `GET /api/health` → `{"ok":true}` (first call to a sleeping service takes ~60 s).
2. `GET /api/csrf-token` → a token, and the `__Host-csrf` cookie is set.
3. Sign in as admin, open a case, add a note → the write is not rejected as CSRF.
4. File a public complaint **with one attachment**, then reopen it and view the
   attachment — this is the only path that proves the bucket wiring end to end.
5. Confirm the new reference is `YY-MM-NNNN` and restarts monthly.

## Schema and migrations

- Production was built with `prisma db push`, so it has **no `_prisma_migrations`
  table**. Do not run `pnpm db:deploy` against it — that would try to create
  tables that already exist. Keep `db:push` as the apply step.
- `prisma/migrations/20261029000000_baseline/migration.sql` is a full baseline
  generated from `schema.prisma`; use it for a fresh database or a preview branch.
- CI regenerates the baseline and fails if it differs from the committed one, so
  a schema edit that forgets the migrations folder is caught in the pull request.

## Still open, by choice

- Demo accounts still carry the seeded `password123` password. Not rotated here.
- Rate limiting uses the in-memory store, so cold starts reset public intake caps.
- Refresh tokens are stored as plaintext in Postgres.
- `docs/SDD.md` and `docs/sddv2.md` still describe the older `BK-` reference form.
