# Room API

NestJS backend for Room event content sharing.

## Prerequisites

- Node.js ≥ 18
- SQL Server (local or container)

## Setup

```bash
npm install
cp .env.example .env   # edit credentials
```

## Run

```bash
npm run start:dev      # development (watch mode)
npm run start:prod     # production
```

Server starts on `http://localhost:3000`.

## Migrations

```bash
npm run migration:generate   # generate from entity diff
npm run migration:run        # apply pending migrations
npm run migration:revert     # rollback last migration
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/rooms` | Create room |
| GET | `/rooms/:id` | Get room by ID |
| PATCH | `/rooms/:id` | Update room |
| DELETE | `/rooms/:id` | Delete room |

### Create Room

```bash
curl -X POST http://localhost:3000/rooms \
  -H "Content-Type: application/json" \
  -d '{"title":"My Wedding","ownerId":"owner-1","mode":"Shared"}'
```

Valid modes: `Private`, `UploadOnly`, `Shared`, `Moderated`.
