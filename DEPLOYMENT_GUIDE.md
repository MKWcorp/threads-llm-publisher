# 🧵 Threads LLM Publisher - Deployment & Testing Guide

**Last Updated:** April 28, 2026  
**Status:** Code-complete, ready for database provisioning & deployment  
**Deployment Target:** Coolify + PostgreSQL

---

## 📋 Project Overview

**Full-stack system** for composing, scheduling, and publishing multi-part posts to Threads from LLM-generated HTML content.

### Key Features
- ✅ OAuth2 integration with Threads
- ✅ HTML parsing & intelligent text splitting (≤500 chars/part)
- ✅ Immediate publish or scheduled posts
- ✅ Multi-part thread chaining (utas)
- ✅ Comment management & inline replies
- ✅ Persistent database storage (Prisma + PostgreSQL)
- ✅ Responsive tab-based UI (React + Vite)
- ✅ Claim-job scheduler (safe for multi-instance)

### Tech Stack
| Layer | Tech | Version |
|-------|------|---------|
| Backend | Express.js + TypeScript | Node 18+ |
| Frontend | React + Vite + TypeScript | React 18 |
| Database | PostgreSQL + Prisma ORM | Prisma 5.22.0 |
| Deployment | Coolify (PaaS) | Any recent |
| API Auth | Threads OAuth2 | v18.0+ |

---

## 🗂️ Project Structure

```
threads-llm-publisher/
├── apps/
│   ├── api/                    # Express backend (port 8787)
│   │   ├── src/
│   │   │   ├── index.ts        # Main server + route mounting
│   │   │   ├── config.ts       # Environment validation (Zod)
│   │   │   ├── types.ts        # Shared TypeScript interfaces
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts   # PrismaClient singleton
│   │   │   ├── services/
│   │   │   │   ├── tokenStore.ts      # OAuth token lifecycle (DB-backed, encrypted)
│   │   │   │   ├── scheduler.ts       # Job publisher (10s polling, claim-job pattern)
│   │   │   │   ├── threadsClient.ts   # Threads API wrapper
│   │   │   │   └── htmlSplitter.ts    # HTML→text splitting (3-pass strategy)
│   │   │   └── routes/
│   │   │       ├── auth.ts     # OAuth flow + token status
│   │   │       ├── publish.ts  # Post composition & scheduling
│   │   │       └── comments.ts # Comment management & replies
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema (User, Token, PublishJob, etc.)
│   │   └── package.json        # Scripts: db:generate, db:migrate, db:dev, db:studio
│   └── web/                    # React frontend (Vite, serves ~3001)
│       ├── src/
│       │   ├── App.tsx         # Tab router (Compose|Scheduled|Published|Comments|Settings)
│       │   ├── main.tsx        # React entrypoint
│       │   └── components/
│       │       ├── Compose.tsx      # HTML input → split → publish/schedule
│       │       ├── Scheduled.tsx    # Pending job list (5s refresh)
│       │       ├── Published.tsx    # Published posts (reverse chrono)
│       │       ├── Comments.tsx     # Comments → inline reply (10s refresh)
│       │       └── Settings.tsx     # OAuth status & token info (10s refresh)
│       ├── vite.config.ts
│       └── package.json
├── packages/
│   └── shared/                 # (Minimal; mostly in /types)
├── nixpacks.toml              # Build orchestration for Coolify
├── package.json               # Root workspace (monorepo)
└── .env.example               # Template (see below)
```

---

## 🔑 Environment Variables

### Required for Coolify

**Create in Coolify "Environment" panel for API service:**

```bash
# Database
DATABASE_URL=postgresql://user:password@postgres-host:5432/threads_db

# Threads OAuth
THREADS_APP_ID=your_app_id
THREADS_APP_SECRET=your_app_secret
THREADS_REDIRECT_URI=https://mkwiro.online/api/auth/threads/callback

# Token Encryption (generate a random 32-char hex string)
ENCRYPTION_MASTER_KEY=your_random_32_char_hex_key_here

# Server
PORT=8787
NODE_ENV=production
```

**Local Development (.env file):**

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/threads_dev
THREADS_APP_ID=test_app_id
THREADS_APP_SECRET=test_app_secret
THREADS_REDIRECT_URI=http://localhost:3000/api/auth/threads/callback
ENCRYPTION_MASTER_KEY=00112233445566778899aabbccddeeff
PORT=8787
NODE_ENV=development
```

### Generate ENCRYPTION_MASTER_KEY (Node.js)

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## 📊 Database Schema

**4 core tables + 1 enum:**

```sql
-- User (center point for all data)
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  threadsUserId TEXT UNIQUE NOT NULL,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

-- OAuth Token (encrypted accessToken)
CREATE TABLE "Token" (
  id TEXT PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL REFERENCES "User"(id),
  accessToken TEXT NOT NULL,  -- AES-256-GCM encrypted
  expiresAt BIGINT NOT NULL,
  createdAt TIMESTAMP DEFAULT now()
);

-- Scheduled/Published Jobs
CREATE TABLE "PublishJob" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES "User"(id),
  text TEXT NOT NULL,
  imageUrl TEXT,
  parts TEXT[],  -- JSON array of post parts
  scheduledAt TIMESTAMP,
  status TEXT NOT NULL,  -- 'pending'|'processing'|'published'|'failed'|'cancelled'
  threadsPostId TEXT,
  error TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_jobs_status_scheduled ON "PublishJob"(status, "scheduledAt");

-- Draft Posts (intermediate state)
CREATE TABLE "Draft" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES "User"(id),
  htmlInput TEXT,
  parts TEXT[],
  title TEXT
);

-- Comment Audit Trail
CREATE TABLE "Comment" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES "User"(id),
  threadsCommentId TEXT UNIQUE NOT NULL,
  text TEXT,
  username TEXT,
  repliedAt TIMESTAMP,
  replyText TEXT,
  createdAt TIMESTAMP DEFAULT now()
);
```

**Prisma Migration File:** Auto-generated at `apps/api/prisma/migrations/0_init/migration.sql`

---

## 🚀 Deployment Steps

### Step 1: Provision PostgreSQL in Coolify (5 min)

1. Open **Coolify dashboard** → Your project
2. Click **"New Service"** → **PostgreSQL**
3. Configure:
   - **Database Name:** `threads_db`
   - **Root username:** `postgres`
   - **Root password:** Generate something strong (e.g., `SecureP@ss123!`)
4. Click **Create Service**
5. Wait for PostgreSQL container to start (green status)
6. Go to **PostgreSQL service** → Copy connection string from details panel

### Step 2: Set Environment Variables in API Service (2 min)

1. In Coolify, go to **API service** → **Environment**
2. Add these variables:
   - `DATABASE_URL=postgresql://postgres:YourPassword@postgres-service:5432/threads_db`
   - `THREADS_APP_ID=<from Meta App>`
   - `THREADS_APP_SECRET=<from Meta App>`
   - `THREADS_REDIRECT_URI=https://mkwiro.online/api/auth/threads/callback`
   - `ENCRYPTION_MASTER_KEY=<32-char hex>`
   - `PORT=8787`
   - `NODE_ENV=production`
3. Click **Save**

### Step 3: Deploy API (2 min)

1. Push latest code to GitHub
   ```bash
   git add .
   git commit -m "Feat: Fase 1-3 complete - Prisma DB, tab UI, multi-part publishing"
   git push origin main
   ```

2. In Coolify → **API service** → Click **Redeploy**
3. Wait for deployment (nixpacks will auto-run `prisma migrate deploy`)
4. Check **Logs** tab to verify:
   ```
   [Prisma] Applying migration `0_init`
   [Prisma] Applied 1 migration
   ✓ Server listening on port 8787
   ```

### Step 4: Test API Health (1 min)

```bash
curl https://mkwiro.online/api/health
# Expected: {"status":"ok"}

curl https://mkwiro.online/api/auth/threads/status
# Expected: {"connected":false} (until OAuth)
```

### Step 5: Deploy Web Frontend (1 min)

1. Push web code (already done; no changes needed)
2. Coolify auto-redeploys web service on git push
3. Wait for build to complete
4. Visit **https://mkwiro.online**

---

## 🧪 Testing Checklist

### Phase 1: Authentication (5 min)

- [ ] Open **Settings tab** → Click "Reconnect Threads Account"
- [ ] Redirects to Meta OAuth consent screen
- [ ] After approval, redirects back to dashboard
- [ ] **Settings tab** shows ✅ Connected + User ID + token expiry
- [ ] Check Coolify logs: Token saved to PostgreSQL
  ```bash
  # In Coolify PostgreSQL shell:
  SELECT * FROM "Token" LIMIT 1;
  ```

### Phase 2: Publish Now (5 min)

- [ ] Go to **Compose tab**
- [ ] Paste sample HTML:
  ```html
  <h1>Hello World</h1>
  <p>This is my first post on Threads using the LLM publisher!</p>
  <p>It supports multiple paragraphs and automatic splitting.</p>
  ```
- [ ] Click **Preview & Split**
- [ ] See parts array: `["Hello World This is my first post...", "It supports multiple..."]`
- [ ] Verify each part ≤ 500 chars
- [ ] Click **Publish Now**
- [ ] See ✅ Success message with thread ID
- [ ] Verify post appears on Threads (@mention your account)

### Phase 3: Schedule Post (5 min)

- [ ] Go to **Compose tab**
- [ ] Paste another HTML block
- [ ] Click **Preview & Split**
- [ ] Select future date/time (e.g., 5 minutes from now)
- [ ] Click **Schedule**
- [ ] Go to **Scheduled tab** → See job with "pending" status
- [ ] Wait 5-10 seconds → Status changes to "processing" then "published"
- [ ] Post appears on Threads timeline

### Phase 4: Job Management (3 min)

- [ ] Schedule another post for 10 minutes away
- [ ] Go to **Scheduled tab**
- [ ] Click **Cancel** → Job status becomes "cancelled"
- [ ] Click **Retry** on a failed job (if any)
- [ ] Click **Reschedule** → Change date → Job requeued

### Phase 5: Published History (2 min)

- [ ] Go to **Published tab**
- [ ] See all published posts in reverse chronological order
- [ ] For multi-part posts, see part counter: "Part 1 of 3"
- [ ] Click **View on Threads** → Verify it opens correct thread

### Phase 6: Comments & Replies (5 min)

- [ ] Go to **Comments tab**
- [ ] Click **Refresh** or wait 10s for auto-load
- [ ] See recent comments/mentions on your posts
- [ ] Click **Reply** on a comment → Opens reply form
- [ ] Type reply text → Click **Send Reply**
- [ ] See ✅ Reply sent status
- [ ] Verify reply appears in Threads conversation (reload in app)
- [ ] Check **Reply History** to see all replies sent

### Phase 7: Full Restart Test (5 min)

- [ ] Restart API service in Coolify
- [ ] Wait for startup (migration auto-runs)
- [ ] Go to **Published tab** → All old posts still visible ✅
- [ ] Go to **Scheduled tab** → Pending jobs still there ✅
- [ ] Scheduler resumes polling; completes any pending jobs ✅

---

## 🔧 Local Development Setup

### Initial Setup

```bash
# Install dependencies
npm install

# Set up .env (copy from .env.example)
cp .env.example .env
# Edit .env with local PostgreSQL details

# Generate Prisma client
npm run db:generate -w @myapps/api

# Run migrations (creates schema)
npm run db:migrate -w @myapps/api
```

### Development Servers

**Terminal 1: API**
```bash
npm run dev -w @myapps/api
# Starts on http://localhost:8787
```

**Terminal 2: Web**
```bash
npm run dev -w @myapps/web
# Starts on http://localhost:5173
```

### Database Management

```bash
# View/edit database in Prisma Studio
npm run db:studio -w @myapps/api

# Reset database (wipe all data)
npm run db:reset -w @myapps/api

# Generate new migration after schema changes
npm run db:migrate -w @myapps/api

# Inspect migration status
npm run db:status -w @myapps/api
```

---

## 🐛 Troubleshooting

### Error: "Database connection refused"

**Cause:** Coolify PostgreSQL service not running or DATABASE_URL incorrect

**Fix:**
1. Check Coolify PostgreSQL service status (should be green)
2. Verify DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
3. Test connection: `psql DATABASE_URL`

### Error: "Token not found" (401 Unauthorized)

**Cause:** User never completed OAuth or token expired

**Fix:**
1. Go to **Settings tab** → Click **Reconnect Threads Account**
2. Complete OAuth flow
3. Verify token stored in DB: `SELECT * FROM "Token" WHERE "userId"='...'`

### Error: "Post not published after scheduled time"

**Cause:** Scheduler stuck or Threads API error

**Fix:**
1. Check API logs in Coolify for errors
2. Go to **Scheduled tab** → Check job status
3. If status = "failed", see error message
4. Click **Retry** to requeue job
5. If persist, check:
   - THREADS_APP_ID/SECRET validity
   - Token expiry in DB
   - Threads API rate limits

### Error: "HTML split produces invalid parts"

**Cause:** htmlSplitter logic or edge case in text

**Fix:**
1. Try simpler HTML: `<p>Short text</p>`
2. Check console browser DevTools for split result
3. Verify each part < 500 chars in preview

### Error: "CORS error from frontend"

**Cause:** API not accepting DELETE or other methods

**Fix:**
1. Verify `apps/api/src/index.ts` has DELETE in CORS allowed methods:
   ```typescript
   app.use(cors({ methods: ['GET', 'POST', 'DELETE', ...] }));
   ```

### Error: "Page refresh loses scheduled jobs"

**Cause:** Data was in memory (old version) — should NOT happen with DB

**Fix:**
1. Verify DATABASE_URL is set and valid
2. Check API logs: `SELECT * FROM "PublishJob"` returns rows
3. Restart service and verify data persists

---

## 📈 Performance Tips

| Task | Limit | Notes |
|------|-------|-------|
| Post length | 500 chars/part | Threads limit; auto-split |
| Image size | <10 MB | Threads API limit |
| Scheduler poll | 10s interval | Configurable in scheduler.ts |
| Auto-refresh | 5-10s | Per component; adjust if needed |
| DB connections | 5 default | Increase in Coolify if needed |

---

## 🔐 Security Checklist

- [ ] `ENCRYPTION_MASTER_KEY` is 32-char random hex (not hardcoded)
- [ ] `THREADS_APP_SECRET` is stored ONLY in Coolify env, never in git
- [ ] `DATABASE_URL` uses strong password (20+ chars, mixed case/numbers/symbols)
- [ ] PostgreSQL service has no public IP exposure (internal network only)
- [ ] OAuth redirect URI matches Meta app settings exactly
- [ ] HTTPS enabled (mkwiro.online uses SSL via Cloudflare)

---

## 📞 Debugging Commands

### Check API Status
```bash
curl -H "Content-Type: application/json" https://mkwiro.online/api/health
```

### List Current Jobs
```bash
curl https://mkwiro.online/api/publish/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View Recent Comments
```bash
curl https://mkwiro.online/api/comments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Connect to PostgreSQL via CLI
```bash
# From Coolify or local machine
psql postgresql://postgres:password@db-host:5432/threads_db

# Useful queries:
SELECT * FROM "User" LIMIT 1;
SELECT * FROM "Token" WHERE "userId"='user-id';
SELECT * FROM "PublishJob" WHERE status='scheduled' ORDER BY "scheduledAt";
SELECT * FROM "Comment" WHERE "repliedAt" IS NOT NULL;
```

---

## 📝 Code Reference

### Key Exports

**tokenStore.ts**
```typescript
save(token: OAuthToken): Promise<void>        // Encrypt & store token
get(): Promise<{userId, token}  | null>      // Retrieve & decrypt token
isConnected(): Promise<boolean>                // Check if token exists
getUserId(): Promise<string | null>            // Get current user ID
```

**scheduler.ts**
```typescript
schedule(userId, text, scheduledAt, options?): Promise<PublishJob>
list(userId?): Promise<PublishJob[]>
cancel(id: string): Promise<boolean>
retry(id: string): Promise<boolean>
reschedule(id: string, scheduledAt: Date): Promise<boolean>
```

**htmlSplitter.ts**
```typescript
splitHtmlToThreads(html: string): string[]    // Main function; returns parts array
```

**threadsClient.ts**
```typescript
publishNow(token, text, imageUrl?): Promise<{creationId, threadsPostId}>
publishThread(token, parts[], imageUrl?): Promise<threadId>
replyToComment(token, replyToId, text): Promise<boolean>
getConversation(token, postId): Promise<Comment[]>
```

---

## 🎯 Next Phase Ideas

After MVP is stable:

1. **Analytics:** Track post engagement, comment sentiment
2. **Batch composer:** Upload CSV of posts → auto-schedule entire month
3. **Image hosting:** Auto-upload images from URLs to CDN
4. **Template library:** Save/reuse common post formats
5. **Webhook integrations:** Auto-publish from RSS/newsletter
6. **Multi-account:** Support multiple Threads accounts per user
7. **Mobile app:** React Native version of composer

---

## 📧 Support Matrix

| Issue | Check | Command |
|-------|-------|---------|
| Deploy failed | Logs | Coolify → API service → Logs tab |
| DB migration stuck | Status | `npm run db:status -w @myapps/api` |
| Token invalid | Expiry | `SELECT expiresAt FROM "Token"` |
| Jobs not publishing | Scheduler | `/api/publish/jobs` endpoint |
| Comments not loading | Token scopes | Verify `threads_manage_replies` in THREADS_SCOPES |

---

**Version:** 1.0  
**Last Sync:** April 28, 2026  
**Author:** Development Team  
**Status:** Ready for production deployment
