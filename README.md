# Mongo Note — Secure Note-Taking API

A Node.js REST API built with **Express**, **Mongoose** and **MongoDB**, implementing the interview task:

- JWT authentication with bcrypt password hashing.
- Users can create, read, update and delete **their own** notes.
- Admins inherit those rights, can manage users, and can read every note.
- Every list endpoint is paginated.
- **Scenario 1:** users grouped by interest using exactly one `collection.aggregate()` call.
- **Scenario 2:** a user's posts resolved with one aggregation pipeline containing `$lookup`.
- Indexes are declared with `schema.index(...)` so they are visible in the models.

The separate React frontend lives in [`mongo-note-web`](../mongo-note-web).

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20.19+ (tested on Node 24) |
| Web framework | Express 5 |
| ODM | Mongoose 9 |
| Database | MongoDB (Community Server 6+) |
| Authentication | JWT (`jsonwebtoken`, HS256) |
| Password hashing | bcrypt (`bcryptjs`, 12 rounds) |
| Validation | `express-validator` |
| Tests | Node's built-in test runner + Supertest |

## Requirements

- Node.js **20.19+**
- npm 10+
- MongoDB Server running locally (default `mongodb://127.0.0.1:27017`)

No PHP or other runtime is required.

## Installation

```bash
npm install

cp .env.example .env
```

Generate a JWT secret and put it in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```dotenv
JWT_SECRET=<paste the generated value>
JWT_TTL=60          # access-token lifetime in minutes
JWT_ISSUER=mongo-note
```

Full configuration:

```dotenv
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/mongo_note
JWT_SECRET=...
JWT_TTL=60
JWT_ISSUER=mongo-note
BCRYPT_ROUNDS=12
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

`CORS_ALLOWED_ORIGINS` is a comma-separated list of the frontend origins allowed to call the API.

## Seed

```bash
npm run seed
```

The seeder is idempotent: if the database already has users it prints a message and exits. It creates the demo accounts, one note per demo user, a couple of posts, and a handful of users with varied interests so both aggregations and pagination have data.

To reseed from scratch, drop the `mongo_note` database first and run `npm run seed` again.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `Password123!` |
| User | `user@example.com` | `Password123!` |

## Run

```bash
npm run dev     # node --watch
npm start       # production-style start
```

The API listens on `http://localhost:8000/api`. Health check: `GET /api/health`.

## Tests

The suite uses a separate MongoDB database, `mongo_note_test` (configured in `tests/setup.js`). MongoDB must be running; no transactions are required.

```bash
npm test
```

Current result: **18 tests, 18 passing**.

The tests cover auth, password hashing, notes ownership, admin read-only access to other users' notes, admin user CRUD, self-demotion/self-delete protection, cascade deletion, pagination, both aggregation scenarios, and the public posts feed.

## Roles and permissions

| Capability | User | Admin |
|---|:---:|:---:|
| Register / log in / log out | ✅ | ✅ |
| Create, update, delete **own** notes | ✅ | ✅ |
| Read own notes | ✅ | ✅ |
| Read **every** note | ❌ | ✅ |
| Create/delete own public posts | ✅ | ✅ |
| Read the public posts feed | ✅ (public) | ✅ (public) |
| Create, update, delete, list users | ❌ | ✅ |
| Scenario 1 — users grouped by interest | ❌ | ✅ |
| Change own role / delete own account | ❌ (blocked) | ❌ (blocked) |

Notes are always private to their owner. Admins can read all notes, but only the owner can edit or delete a note.

## API reference

Base URL: `/api`. Authenticated requests send:

```
Authorization: Bearer <access_token>
Accept: application/json
```

Login and register return:

```json
{
  "user": { "id": "…", "name": "Admin User", "email": "admin@example.com", "role": "admin", "interests": ["chess", "reading"], "created_at": "…", "updated_at": "…" },
  "access_token": "eyJ…",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Pagination

All list endpoints accept `?page=N&per_page=10` (`per_page` between 1 and 100, default 10) and return:

```json
{
  "data": [],
  "links": { "first": "…", "last": "…", "prev": null, "next": "…" },
  "meta": { "current_page": 1, "last_page": 3, "per_page": 10, "total": 23, "from": 1, "to": 10 }
}
```

The two aggregation endpoints paginate inside the pipeline and return the same `data` + `meta` envelope without `links`.

### Endpoints

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | — | — | Rate-limited (10/min). Always creates a `user`. |
| POST | `/auth/login` | — | — | Rate-limited (10/min). Returns a JWT. |
| GET | `/auth/me` | ✅ | any | Current user. |
| POST | `/auth/logout` | ✅ | any | Stateless: the client discards the token. |
| GET | `/notes` | ✅ | any | Users see their own notes; admins see all. Admin extra filter: `?user_id=<24-hex>`. |
| POST | `/notes` | ✅ | any | Body: `title`, `body`. Owner is the authenticated user. |
| GET | `/notes/{id}` | ✅ | any | 403 unless owner or admin. |
| PUT/PATCH | `/notes/{id}` | ✅ | owner | Admins may read but **not** modify other users' notes. |
| DELETE | `/notes/{id}` | ✅ | owner | 204 on success. |
| GET | `/posts` | — | — | Public feed, newest first. |
| POST | `/posts` | ✅ | any | Body: `title`, `body`. |
| DELETE | `/posts/{id}` | ✅ | owner | 204 on success. |
| GET | `/users/{id}/posts` | — | — | **Scenario 2.** Public posts by one user, with embedded `author`. |
| GET | `/users` | ✅ | admin | Paginated user list, newest first. |
| POST | `/users` | ✅ | admin | Body: `name`, `email`, `password`, `role`, `interests[]`. |
| GET | `/users/{id}` | ✅ | admin | Single user. |
| PUT/PATCH | `/users/{id}` | ✅ | admin | All fields optional; password only changed when supplied. |
| DELETE | `/users/{id}` | ✅ | admin | Also removes the user's notes and posts. Cannot delete yourself. |
| GET | `/users/grouped-by-interests` | ✅ | admin | **Scenario 1.** Grouped users, paginated. |

Validation failures return `422` with `message` + `errors`; authorization failures return `403`; missing/invalid tokens return `401`.

## Data model

```text
users   { _id, name, email, password (bcrypt), role: "user"|"admin", interests: [string], created_at, updated_at }
notes   { _id, user_id: ObjectId → users._id, title, body, created_at, updated_at }
posts   { _id, user_id: ObjectId → users._id, title, body, created_at, updated_at }
```

`user_id` is a real BSON `ObjectId` (Mongoose `ref: 'User'`), so references, `populate()` and `$lookup` all work. JSON exposes it as a 24-character hex string.

Mongoose timestamps are configured as `created_at` / `updated_at` so the stored fields and the response fields match exactly.

## Indexes and why

Declared in `src/models/*.js` with `schema.index(...)`; no speculative indexes.

| Collection | Index | Key | Why |
|---|---|---|---|
| `users` | `users_email_unique` | `email` (unique) | Login/lookup by email, and unique accounts. |
| `users` | `users_created_at_desc` | `created_at: -1` | Admin user list sorted newest first. |
| `users` | `users_interests` | `interests` (multikey) | Scenario 1 `$match`/`$unwind` over the interests array. |
| `notes` | `notes_user_id_created_at_desc` | `user_id: 1, created_at: -1` | "My notes" filter + sort in one index. |
| `notes` | `notes_created_at_desc` | `created_at: -1` | Admin "all notes" feed. |
| `posts` | `posts_user_id_created_at_desc` | `user_id: 1, created_at: -1` | Scenario 2 `$match` + `$sort`; also the per-user filter. |
| `posts` | `posts_created_at_desc` | `created_at: -1` | Public posts feed. |

The `users._id` index that `$lookup` joins against is MongoDB's default primary-key index, so no extra index is needed there. Single-document reads (`GET /notes/{id}`, `GET /users/{id}`, `GET /posts/{id}`) also use the default `_id` index rather than adding a redundant one.

Every index above is declared with `schema.index(...)` inside the model file, so it is visible during review.

## Scenario 1 — group users by interests

`GET /api/users/grouped-by-interests` (admin only), implemented in `src/controllers/userController.js`.

**Exactly one** aggregation call:

```js
const [result] = await User.collection.aggregate(pipeline).toArray()
```

Pipeline:

1. `$match` users that have an `interests` field.
2. `$unwind` the `interests` array.
3. `$group` by interest, counting users and pushing `{id, name, email}`.
4. `$project` a clean `{interest, count, users}` shape.
5. `$sort` by `count` descending, then interest name.
6. `$facet` for `data` (`$skip`/`$limit`) and `meta` (`$count`), so pagination happens inside the same pipeline.

Response:

```json
{
  "data": [
    { "interest": "reading", "count": 5, "users": [ { "id": "…", "name": "Admin User", "email": "admin@example.com" } ] }
  ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 10, "total": 6, "from": 1, "to": 6 }
}
```

## Scenario 2 — a user's posts with `$lookup`

`GET /api/users/{id}/posts` (public), implemented in `src/controllers/postController.js`.

One pipeline:

1. `$match` `{ user_id: ObjectId(id) }` — uses `posts_user_id_created_at_desc`.
2. `$sort` `{ created_at: -1 }`.
3. `$facet` → `data`: `$skip`/`$limit`, then `$lookup` from `users` on `user_id → _id`, `$unwind` the author, and `$project` only the public fields.
4. `$facet` → `meta`: `$count`.

Posts live in their own `posts` collection and are public to read. The response embeds the author:

```json
{
  "data": [
    {
      "id": "…",
      "title": "Hello from the regular user",
      "body": "…",
      "user_id": "…",
      "created_at": "…",
      "updated_at": "…",
      "author": { "id": "…", "name": "Regular User" }
    }
  ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 10, "total": 1, "from": 1, "to": 1 }
}
```

## Security notes

- Passwords are hashed with bcrypt (`BCRYPT_ROUNDS=12`) via a Mongoose `pre('save')` hook and never returned in responses (`select: false` plus a JSON transform).
- JWTs are HS256, signed with `JWT_SECRET`, and carry `iss`, `sub`, `role`, `iat`, `nbf`, `exp`, `jti`.
- The auth middleware validates the signature, issuer and expiry, then loads the user from MongoDB, so a deleted user's token stops working immediately.
- Login/register are throttled to 10 requests per minute per IP (`express-rate-limit`).
- Ownership checks are explicit (`403`), and admins cannot escalate their own role or delete their own account.
- Request bodies are validated with `express-validator`; models use explicit schemas and no mass-assignment of `_id`.
- Helmet sets standard security headers; CORS is restricted to the configured frontend origins.
- Invalid or missing tokens always return `401 JSON` (no redirects).

## Project layout

```text
src/
  app.js                 # Express app (helmet, CORS, JSON, routes, errors)
  server.js              # DB connection, index init, HTTP listener
  config.js              # env configuration
  db.js                  # Mongoose connect/disconnect
  models/
    User.js              # schema + indexes + bcrypt hook
    Note.js              # schema + indexes + author virtual
    Post.js              # schema + indexes + author virtual
  controllers/           # auth, note, post, user handlers
  routes/                # auth, notes, posts, users
  middleware/            # auth, admin, validation, rate limit, errors
  validation/rules.js    # express-validator rule sets
  utils/                 # JWT, pagination, JSON presenters, ApiError
  scripts/seed.js        # demo data
tests/                   # node:test + Supertest suites
```
