# K-Hoed 🎯

A production-quality, real-time quiz platform built entirely on Cloudflare infrastructure.
Inspired by the live-quiz genre — own your stack, no vendor lock-in beyond Cloudflare.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                        │
│  React + Vite + Tailwind + Zustand + React Query           │
└──────────────┬───────────────────────────────┬──────────────┘
               │  HTTPS REST                   │  WSS
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Worker (Hono router)                            │
│  /api/auth  /api/quizzes  /api/games  /api/upload           │
│  /api/rooms/:code/ws  →  delegates to Durable Object        │
│  GET *  →  serves React SPA from ASSETS binding             │
└──────┬─────────────────────────────────────────────┬────────┘
       │ D1 SQL                         │ DO fetch   │ R2
       ▼                               ▼             ▼
┌────────────┐  ┌──────────────────────────────┐  ┌────────┐
│ D1 SQLite  │  │ GameRoom Durable Object       │  │ R2     │
│  users     │  │  • one instance per room code │  │ images │
│  quizzes   │  │  • holds all WS connections   │  └────────┘
│  questions │  │  • authoritative game state   │
│  sessions  │  │  • question alarms            │
│  results   │  │  • reconnect handling         │
└────────────┘  └──────────────────────────────┘
```

### Game state machine

```
lobby → question → revealing → leaderboard → question → … → ended
          ↑ alarm fires / all answered         ↑ host: next_question
```

---

## Quick start — local development

### Prerequisites

- Node.js ≥ 20
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm i -g wrangler`)
- Cloudflare account (free tier is sufficient)

### 1. Clone & install

```bash
git clone <your-repo-url> k-hoed
cd k-hoed
npm install
cd client && npm install && cd ..
```

### 2. Authenticate Wrangler

```bash
wrangler login
```

### 3. Create Cloudflare resources

```bash
# D1 database — note the returned database_id
wrangler d1 create k-hoed-db

# R2 bucket
wrangler r2 bucket create k-hoed-images
```

Update `wrangler.toml` with the `database_id` returned by the D1 command.

### 4. Apply migrations

```bash
npm run db:migrate:dev   # local D1
npm run db:seed:dev      # optional sample data
```

### 5. Set secrets

```bash
# Generate a strong random string (e.g. openssl rand -hex 32)
wrangler secret put JWT_SECRET
```

### 6. Run dev servers

```bash
npm run dev
```

- **Worker** → <http://localhost:8787>
- **React client** → <http://localhost:5173> (proxies API calls to the Worker)

---

## Deployment to Cloudflare

### 1. Apply migrations to remote D1

```bash
npm run db:migrate
```

### 2. Set production secrets

```bash
wrangler secret put JWT_SECRET           # strong random string
wrangler secret put TURNSTILE_SECRET_KEY # optional: from Cloudflare Turnstile dashboard
```

### 3. Deploy

```bash
npm run deploy
```

This builds the React SPA, then runs `wrangler deploy` which uploads both the Worker and the
static assets as a single deployment.

### 4. Configure R2 public access (optional)

For quiz images to be accessible:

1. Go to Cloudflare Dashboard → R2 → k-hoed-images → Settings
2. Enable "Public Access" and note the public URL
3. Update `R2_PUBLIC_URL` in `wrangler.toml` (or `wrangler vars put R2_PUBLIC_URL <url>`)

---

## Environment variables reference

| Variable | Where | Description |
|---|---|---|
| `JWT_SECRET` | Secret | HMAC-SHA256 signing key for JWTs. Min 32 chars. |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Turnstile server secret (optional). |
| `ENVIRONMENT` | Var | `"development"` or `"production"`. |
| `R2_PUBLIC_URL` | Var | Base URL for public R2 image access. |

---

## Running tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# E2E tests (requires both dev servers running)
npm run dev &
npm run test:e2e
```

---

## Project structure

```
k-hoed/
├── src/                          # Cloudflare Worker
│   ├── index.ts                  # Entry point + route registration
│   ├── worker-env.d.ts           # CF bindings type declarations
│   ├── durable-objects/
│   │   └── GameRoom.ts           # Live game state (WebSocket + alarm)
│   ├── routes/
│   │   ├── auth.ts               # Register, login, /me
│   │   ├── quizzes.ts            # Quiz CRUD + duplicate + export/import
│   │   ├── games.ts              # Session management
│   │   └── upload.ts             # R2 image upload
│   ├── middleware/
│   │   └── auth.ts               # JWT guard middleware
│   ├── lib/
│   │   ├── auth.ts               # JWT (jose) + PBKDF2 password hashing
│   │   ├── db.ts                 # Typed D1 query helpers
│   │   ├── scoring.ts            # Score calculation + leaderboard
│   │   ├── rate-limit.ts         # In-memory rate limiting
│   │   ├── room-code.ts          # Room code + UUID generation
│   │   └── profanity.ts          # Nickname filter
│   └── types/
│       └── index.ts              # Shared domain types + WS protocol
│
├── client/                       # React SPA (Vite)
│   ├── src/
│   │   ├── App.tsx               # Router + protected routes
│   │   ├── pages/                # One file per route
│   │   ├── components/
│   │   │   ├── ui/               # Button, Input, Card, Modal, …
│   │   │   ├── game/             # Timer, Leaderboard, AnswerDistribution
│   │   │   └── layout/           # Layout, Navbar
│   │   ├── stores/
│   │   │   ├── authStore.ts      # Zustand: JWT + user
│   │   │   └── gameStore.ts      # Zustand: live game state
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts   # Managed WebSocket with reconnection
│   │   │   ├── useAuth.ts        # Login / register / logout
│   │   │   └── useGame.ts        # Host & player game hooks
│   │   └── lib/
│   │       ├── api.ts            # Typed API client
│   │       ├── types.ts          # Client-side domain types
│   │       ├── utils.ts          # Tailwind utils, colours, helpers
│   │       └── websocket.ts      # Low-level WebSocket wrapper
│   ├── tailwind.config.ts
│   └── vite.config.ts
│
├── migrations/
│   ├── 0001_initial.sql          # Full D1 schema
│   └── 0002_seed.sql             # Sample quiz data
│
├── tests/
│   ├── unit/
│   │   ├── scoring.test.ts       # calculateScore, evaluateAnswer, buildLeaderboard
│   │   └── auth.test.ts          # hashPassword, JWT sign/verify
│   └── e2e/
│       └── game-flow.spec.ts     # Host + 2 players full flow
│
├── wrangler.toml
├── package.json
└── README.md
```

---

## Scoring algorithm

Points are awarded for correct answers, scaled by response speed:

```
responseTimeFraction = max(0, 1 - (responseMs - graceMs) / timeLimitMs)
multiplier           = 0.5 + 0.5 * responseTimeFraction
finalScore           = round(basePoints * multiplier)
```

- Minimum: **50%** of base points (for slow-but-correct answers)
- Maximum: **100%** of base points (for answers within the grace window)
- Incorrect answers: **0 points**
- Duplicate submissions: silently rejected

---

## WebSocket protocol

Connections: `wss://<host>/api/rooms/:code/ws?role=host|player&sessionId=…&token=…`

All messages are JSON. See `src/types/index.ts` for the full `ClientMessage` and `ServerMessage`
discriminated union types.

---

## Security notes

- Passwords hashed with **PBKDF2-SHA256** (310,000 iterations) via Web Crypto API
- JWTs signed with **HMAC-SHA256**, 7-day expiry
- All D1 queries use **parameterised statements** — no SQL injection risk
- Rate limiting on register / login / game-create / room-lookup endpoints
- Host actions validated by JWT + ownership check in every handler
- Players cannot impersonate hosts — role is checked via JWT in the Durable Object
- Image uploads validated for MIME type and size before storing to R2
- Profanity filter on player display names
- Do **not** commit secrets — use `wrangler secret put`
