# ⚡ Quick Reference Card

## 🚀 5-Step Deployment (15 minutes)

1. **PostgreSQL in Coolify** → New Service → PostgreSQL → Copy connection string
2. **Set Env Vars** → API service → Environment → Add DATABASE_URL + THREADS_APP_ID/SECRET + ENCRYPTION_MASTER_KEY
3. **Git Push** → Commit code → Push to main → Coolify auto-detects
4. **Monitor Logs** → Check "Prisma migration applied" message
5. **Test OAuth** → Open Settings tab → Click Reconnect → Verify connected ✅

---

## 📋 Full Testing (30 minutes)

| Tab | Action | Expected Result |
|-----|--------|-----------------|
| **Settings** | Click Reconnect | ✅ Connected + User ID |
| **Compose** | Paste HTML → Preview | See parts array |
| **Compose** | Publish Now | ✅ Shows on Threads |
| **Compose** | Schedule +5min | Job queued |
| **Scheduled** | Wait/Refresh | Job auto-publishes |
| **Published** | Check | All posts visible |
| **Comments** | Reply to comment | ✅ Reply appears |

---

## 🔗 Key URLs

| Service | URL |
|---------|-----|
| **Web App** | https://mkwiro.online |
| **API Health** | https://mkwiro.online/api/health |
| **API Status** | https://mkwiro.online/api/auth/threads/status |
| **Coolify** | https://coolify.mkwiro.online |
| **Threads** | https://threads.net |

---

## 🔑 Required Secrets

```
DATABASE_URL=postgresql://postgres:PASSWORD@postgres-service:5432/threads_db
THREADS_APP_ID=
THREADS_APP_SECRET=
THREADS_REDIRECT_URI=https://mkwiro.online/api/auth/threads/callback
ENCRYPTION_MASTER_KEY=<32-char hex: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))">
PORT=8787
```

---

## 📊 Database Tables (Quick Check)

```sql
-- Verify schema created:
\dt  -- List tables

-- Check token stored:
SELECT COUNT(*) FROM "Token";

-- Check jobs:
SELECT COUNT(*) FROM "PublishJob" WHERE status='published';

-- Check comments:
SELECT COUNT(*) FROM "Comment" WHERE "repliedAt" IS NOT NULL;
```

---

## 🐛 Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| "Database connection refused" | Check PostgreSQL service is running (green in Coolify) |
| "Token not found (401)" | Go Settings → Reconnect → Complete OAuth |
| "Post not published after time" | Check /api/publish/jobs; see error; click Retry |
| "CORS error from browser" | Verify DELETE in CORS methods in src/index.ts |
| "Scheduled jobs lost after restart" | Check DATABASE_URL set + migration ran |

---

## 💻 Local Dev Commands

```bash
# One-time setup
npm install
npm run db:generate -w @myapps/api
npm run db:migrate -w @myapps/api

# Dev servers (two terminals)
npm run dev -w @myapps/api      # Port 8787
npm run dev -w @myapps/web      # Port 5173

# Database tools
npm run db:studio -w @myapps/api    # GUI browser
npm run db:reset -w @myapps/api     # Wipe & recreate
```

---

## 📱 Component Map (Frontend)

```
App.tsx (tab router)
├── ✍️  Compose.tsx     → HTML textarea → preview-split → publish/schedule
├── 📅 Scheduled.tsx    → List pending jobs → cancel/retry/reschedule
├── ✅ Published.tsx    → List published posts → Threads link
├── 💬 Comments.tsx     → Load comments → inline reply
└── ⚙️  Settings.tsx    → OAuth status → reconnect
```

---

## 🔄 API Route Map (Backend)

```
POST   /publish/now              → Publish immediately
POST   /publish/schedule         → Schedule for later
POST   /publish/preview-split    → Get parts preview
GET    /publish/jobs             → List pending jobs
DELETE /publish/jobs/:id         → Cancel job
POST   /publish/jobs/:id/retry   → Retry failed
POST   /publish/jobs/:id/reschedule → Change time
GET    /publish/posts            → List published

GET    /comments                 → Load recent comments
POST   /comments/:id/reply       → Send reply
GET    /comments/history         → Replies sent

GET    /auth/threads/start/redirect        → Start OAuth
GET    /auth/threads/callback              → OAuth callback (auto)
GET    /auth/threads/status                → Check connected
```

---

## ✅ Pre-Office Checklist

- [ ] Code committed to main branch
- [ ] .env.example updated with DATABASE_URL template
- [ ] All 5 React components created
- [ ] App.tsx tab navigation implemented
- [ ] prisma/schema.prisma complete
- [ ] All services async-compatible
- [ ] DEPLOYMENT_GUIDE.md written
- [ ] Ready to provision PostgreSQL in Coolify
- [ ] Ready to set env vars in Coolify

---

**Print this card or bookmark on office computer! 📌**
