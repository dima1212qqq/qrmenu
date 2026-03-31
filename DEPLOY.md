# Deployment

## What Changed

The project no longer uses `data.json` as its primary storage.
Application data is now stored in PostgreSQL through Prisma.

Main environment variables:

- `DATABASE_URL`
- `AUTH_SECRET`

## Docker Compose

1. Edit `docker-compose.yml` and replace:
   - `POSTGRES_PASSWORD`
   - `AUTH_SECRET`
   - optionally database/user names
2. Start the stack:

```bash
docker compose up -d --build
```

3. Check logs:

```bash
docker compose logs -f app
docker compose logs -f db
```

The app container runs `npx prisma db push` on startup, so the schema is applied automatically.

## Linux Server Without Docker

1. Install:
   - Node.js 20
   - PostgreSQL 16+
2. Create database and user.
3. Set environment variables:

```bash
export DATABASE_URL='postgresql://menu_qr:password@127.0.0.1:5432/menu_qr?schema=public'
export AUTH_SECRET='replace-with-a-long-random-secret'
```

4. Install dependencies and generate Prisma client:

```bash
npm ci
npx prisma generate
```

5. Apply schema:

```bash
npx prisma db push
```

6. Build and start:

```bash
npm run build
npm run start
```

## Import Existing JSON Data

If you want to keep old data from `data.json`, run after the database schema is created:

```bash
npm run db:migrate:from-json
```

This script reads the local `data.json` and upserts organizations, users, menus, categories, dishes, links, and waiter calls into PostgreSQL.

## Recommended Production Setup

- run the app behind nginx or another reverse proxy
- terminate TLS on the proxy
- keep PostgreSQL on a persistent volume
- set a strong `AUTH_SECRET`
- back up PostgreSQL regularly
