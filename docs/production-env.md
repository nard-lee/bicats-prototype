# Production environment checklist (Render + Neon)

Every variable below is read by `server/src/utils/env.config.ts`, which throws on
a missing required one — the service refuses to boot rather than start half-wired.
The two object-storage and evidence URL knobs (`STORAGE_BUCKET`, `PUBLIC_API_URL`)
are read directly from `process.env` by `storage.ts` and `complaint.helpers.ts`.
Set them in Render → your service → **Environment**, then **Apply & Restart**.
Treat secrets as "Secret text"; the rest can be plain values.

## Which file is the source, locally

- `server/.env` — the only file the app reads for its own settings, resolved from
  `server/src/utils/load-env.js` so it loads from any working directory.
- `.env.local` (repo root) — written by `neon env pull`; loaded *after* `server/.env`
  and only for keys that are still unset, so it supplies the `AWS_*` credentials
  that switch dev uploads to the bucket. It can never replace `DATABASE_URL` or a
  secret set in `server/.env`.
- Nothing reads a `.env.production`. Production values live in Render; keep any
  local note of them out of the repo, since `.env.*` is only ignored by pattern
  and a stray copy is still a secret file.
- The client needs no env file: it is same-origin and reaches the API through the
  Vite proxy (`client/vite.config.ts`).

## Required — the app will not start without these

| Variable | Shape | Why it exists | Verify after deploy |
| --- | --- | --- | --- |
| `PORT` | number | Express listen port | Render injects `$PORT`; leave the default. |
| `NODE_ENV` | `production` | Turns on secure cookies, `trust proxy`, SPA static serving, and the storage guard | `GET /api/health` → `{"ok":true}` |
| `DATABASE_URL` | `postgresql://…` | Neon Postgres connection string (production branch) | Boot log `==> database: connected` |
| `CORS_ORIGIN` | `https://bicats-prototype.onrender.com` | Allowed cross-origin `fetch` with credentials, and the base for tracking links sent to residents | Login POST is not blocked by CORS; a receipt link opens the track page |
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
| `UNISMS_SENDER_ID` | `KABAYANIHAN` | The originator shown on the resident's phone. Carrier limit is 11 characters, so the full "Barangay Kabayanihan" cannot be used; register the chosen ID with UniSMS first |
| `UNISMS_API_URL` | `https://unismsapi.com/api/sms` | SMS endpoint |
| `BREVO_API_KEY` | empty → email never sent | Brevo transactional key |
| `BREVO_SENDER_EMAIL` | empty | From-address on complainant notices |
| `BREVO_SENDER_NAME` | `Barangay Kabayanihan` | From-name the resident sees. Brevo keys its sender identity on the name + address pair, so re-activate this combination at app.brevo.com/settings/senders or sends are refused |
| `BREVO_API_URL` | `https://api.brevo.com/v3/smtp/email` | Email endpoint |
| `PUBLIC_API_URL` | `http://localhost:3000` | Origin used to build `/uploads/…` evidence URLs. Only read when object storage is **off**, so on Render (bucket configured) it changes nothing |

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

## Outbound messages (SMS + email)

- Session and deadline dates are formatted with `timeZone: "Asia/Manila"`
  (`server/src/modules/notify/format.ts`). Render containers are UTC, so a
  message built without it would tell a resident their 9 AM mediation is at
  1 AM. Do not remove the zone.
- Every message ends with a tracking link built from `CORS_ORIGIN`
  (`<CORS_ORIGIN>/track-complaint?ref=YY-MM-NNNN`). That page already accepts
  `?ref=`, so the link pre-fills the reference. Wrong `CORS_ORIGIN` means every
  resident link 404s.
- Resident messages name the barangay, not the system: the SMS sender ID
  (`KABAYANIHAN`) is the originator and email subjects carry no product prefix.
- Notices follow the complainant: `Complaint.complainantLang` is stored at
  intake from the language the public form was in (`en` | `tl`), and every SMS
  and email uses that language's templates. Staff notes (`publicNote`) are
  delivered exactly as typed in both languages.

## Smoke test after each deploy

1. `GET /api/health` → `{"ok":true}` (first call to a sleeping service takes ~60 s).
2. `GET /api/csrf-token` → a token, and the `__Host-csrf` cookie is set.
3. Sign in as admin, open a case, add a note → the write is not rejected as CSRF.
4. File a public complaint **with one attachment**, then reopen it and view the
   attachment — this is the only path that proves the bucket wiring end to end.
5. Confirm the new reference is `YY-MM-NNNN` and restarts monthly.
6. File one complaint with the public form switched to Tagalog — the receipt
   email arrives in Tagalog, its Manila time is right, and its link opens the
   track page with the reference filled in.

## Schema and migrations

- Production was built with `prisma db push`, so it has **no `_prisma_migrations`
  table**. Do not run `pnpm db:deploy` against it — that would try to create
  tables that already exist. Keep `db:push` as the apply step.
- **Push the schema before deploying code that reads it.** `Complaint.complainantLang`
  (added 2026-10-29) is written on every public filing, so deploying that build
  onto a database without the column fails every filing with a 500. With
  `DATABASE_URL` pointed at the production branch:
  `pnpm exec prisma db push`.
- `prisma/migrations/20261029000000_baseline/migration.sql` is a full baseline
  generated from `schema.prisma`; use it for a fresh database or a preview branch.
- CI regenerates the baseline and fails if it differs from the committed one, so
  a schema edit that forgets the migrations folder is caught in the pull request.
- **Refresh tokens are hashed at rest** (2026-10-29): `RefreshToken.tokenHash`
  holds the SHA-256 digest of the cookie value, so a database dump yields
  strings that cannot be spent. Production still has the plaintext `token`
  column, so the cutover is two additive steps before the deploy and one
  destructive step after it:

  ```sql
  -- 1. Before deploying. Additive; the running build keeps working.
  BEGIN;
  ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "tokenHash" TEXT;
  UPDATE "RefreshToken"
     SET "tokenHash" = encode(sha256(convert_to("token", 'UTF8')), 'hex')
   WHERE "tokenHash" IS NULL;
  ALTER TABLE "RefreshToken" ALTER COLUMN "tokenHash" SET NOT NULL;
  -- The old build inserts "token"; the new one leaves it out.
  ALTER TABLE "RefreshToken" ALTER COLUMN "token" DROP NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key"
    ON "RefreshToken"("tokenHash");
  COMMIT;
  ```

  Backfilling from the column itself means nobody is logged out: the stored
  digest is computed from the same value the client's cookie holds, so existing
  sessions rotate normally. Then deploy, sign in, and confirm `/api/auth/refresh`
  works.

  ```sql
  -- 2. After the deploy is verified. Destroys the plaintext tokens, which is
  -- the point of the change; needs explicit sign-off.
  ALTER TABLE "RefreshToken" DROP COLUMN "token";
  ```

## Still open, by choice

- Demo accounts still carry the seeded `password123` password. Not rotated here.
- Rate limiting uses the in-memory store, so cold starts reset public intake caps.
- `docs/SDD.md` and `docs/sddv2.md` still describe the older `BK-` reference form.
