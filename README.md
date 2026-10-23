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

## Run

Two terminals from the root:

```bash
pnpm dev:server     # API on http://localhost:3000
pnpm dev:client     # app on http://localhost:5173
```

Build check: `pnpm build` (client build + server typecheck).


