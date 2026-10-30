# BICATS — Barangay Complaint System

- `server/` — Express + Prisma + PostgreSQL
- `client/` — React + Vite

## Requirements

Node 20+, pnpm, PostgreSQL.

## Setup

```bash
pnpm install:all

# server
cd server
cp .env.example .env      # fill in the values
createdb -h localhost -p 9147 -U postgres bicats
pnpm db:generate
pnpm db:push
pnpm db:seed:users        # login: james12 / password123 (admin)
pnpm db:seed              # optional sample complaints
```

The client needs no env file — it reaches the API through the Vite proxy.
Object storage is optional: `neon env pull` at the repo root writes the branch's
`AWS_*` credentials into `.env.local`, which the server picks up on the next
start, and uploads then go to the bucket instead of `server/uploads/`.

## Run

Two terminals from the root:

```bash
pnpm dev:server     # API on http://localhost:3000
pnpm dev:client     # app on http://localhost:5173
```

Build check: `pnpm build` (client build + server typecheck).


