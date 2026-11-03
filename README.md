# CodePlay Backend

Express + MongoDB API for **CodePlay Academy** — user authentication and cloud progress sync.

## Setup

1. Install [MongoDB](https://www.mongodb.com/docs/manual/installation/) locally (or use MongoDB Atlas).
2. Copy env and edit if needed:

```bash
cp .env.example .env
```

3. Set `MONGODB_URI` in `.env` to your database (default: `mongodb://127.0.0.1:27017/codeplay-academy`).
4. Install & run:

```bash
npm install
npm run dev
```

API: `http://localhost:5000`

## Collections

| Collection | Purpose |
|------------|---------|
| `users` | Auth accounts (`name`, `email`, hashed `password`) |
| `progresses` | One document per user — XP, lessons, labs, quizzes, missions, etc. |

Progress shape matches `codeplay/src/lib/storage.js` `emptyState()`, with `profile.userId` set to the MongoDB user `_id`.

## Auth

| Method | Path | Body | Auth |
|--------|------|------|------|
| POST | `/api/auth/register` | `{ name, email, password }` | — |
| POST | `/api/auth/login` | `{ email, password }` | — |
| GET | `/api/auth/me` | — | Bearer token |
| PATCH | `/api/auth/me` | `{ name }` | Bearer token |

Send the JWT as `Authorization: Bearer <token>`.

## Admin

On startup the server seeds an admin from `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`, default `admin@codeplay.local` / `admin123456`).

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/admin/users` | Admin Bearer |
| DELETE | `/api/admin/users/:id` | Admin Bearer |

Admins cannot delete themselves or the last remaining admin.

## Progress

All routes require a Bearer token.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/progress` | Full client state |
| PUT | `/api/progress` | Replace full state (sync) |
| PATCH | `/api/progress` | Merge partial fields |
| DELETE | `/api/progress` | Reset |
| POST | `/api/progress/xp` | `{ amount, reason }` |
| POST | `/api/progress/complete-lesson` | `{ lessonId, title }` |
| POST | `/api/progress/complete-experiment` | `{ labId, title, data? }` |
| POST | `/api/progress/complete-project` | `{ projectId, title }` |
| POST | `/api/progress/complete-mission` | `{ missionId, title }` |
| POST | `/api/progress/quiz` | `{ topic, score, total }` |
| POST | `/api/progress/mock` | mock result object |

## Quick test

```bash
# register
curl -s -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Aditya","email":"aditya@example.com","password":"secret12"}'

# login (copy token from response)
curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"aditya@example.com","password":"secret12"}'

# get progress
curl -s http://localhost:5000/api/progress \
  -H "Authorization: Bearer YOUR_TOKEN"
```
