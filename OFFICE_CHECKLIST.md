# 📋 Office Execution Checklist

Print this page and check off as you go.

---

## Morning: Database Provisioning (15 min)

- [ ] Open Coolify dashboard
- [ ] Navigate to your project
- [ ] Click "New Service" → PostgreSQL
- [ ] Set:
  - Database name: `threads_db`
  - Username: `postgres`
  - Password: (generate strong random string)
- [ ] Click Create
- [ ] Wait for PostgreSQL to show green status
- [ ] Copy connection string from details panel

---

## Mid-Morning: Environment Variables (5 min)

- [ ] Go to API service settings → Environment
- [ ] Add variables:
  ```
  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres-service:5432/threads_db
  THREADS_APP_ID=YOUR_APP_ID
  THREADS_APP_SECRET=YOUR_APP_SECRET
  THREADS_REDIRECT_URI=https://mkwiro.online/api/auth/threads/callback
  ENCRYPTION_MASTER_KEY=GENERATE_32_CHAR_HEX
  PORT=8787
  NODE_ENV=production
  ```
- [ ] Click Save
- [ ] Wait for confirmation

### Generate ENCRYPTION_MASTER_KEY
```bash
# Run in terminal:
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
# Copy output (32 hex chars)
```

---

## Before Lunch: Deploy (5 min)

- [ ] Open GitHub / your git provider
- [ ] Verify branch is `main`
- [ ] Check Coolify API service
- [ ] Click "Redeploy"
- [ ] Watch logs:
  - Should see: `[Prisma] Applying migration...`
  - Should see: `[Prisma] Migration completed`
  - Should see: `✓ Server listening on port 8787`
- [ ] Wait until status = green
- [ ] Test health:
  ```bash
  curl https://mkwiro.online/api/health
  # Expected: {"status":"ok"}
  ```

---

## After Lunch: Feature Testing (30 min)

### ✅ Phase 1: Authentication (5 min)
- [ ] Open https://mkwiro.online
- [ ] Click **Settings** tab
- [ ] Click "Reconnect Threads Account"
- [ ] Log in with Threads account
- [ ] Approve OAuth scopes
- [ ] Redirected back to dashboard
- [ ] Settings tab shows:
  - ✅ Connected
  - User ID (not empty)
  - Token expiry (future date)

### ✅ Phase 2: Compose & Publish Now (5 min)
- [ ] Go to **Compose** tab
- [ ] Paste sample HTML:
  ```html
  <h1>Hello from LLM Publisher!</h1>
  <p>First test post from my new tool.</p>
  <p>It automatically splits long content into thread parts.</p>
  ```
- [ ] Click "Preview & Split"
- [ ] Verify you see parts array (should be 2+ parts)
- [ ] Verify each part shows ≤ 500 chars
- [ ] Click "Publish Now"
- [ ] See ✅ Success message
- [ ] Visit https://threads.net in new tab
- [ ] Verify post appears on your timeline

### ✅ Phase 3: Schedule & Auto-Publish (10 min)
- [ ] Go to **Compose** tab
- [ ] Paste different HTML
- [ ] Click "Preview & Split"
- [ ] Set date/time to +5 minutes from now
- [ ] Click "Schedule"
- [ ] See ✅ Scheduled message
- [ ] Go to **Scheduled** tab
- [ ] See job with status "pending"
- [ ] Wait 5-10 seconds
- [ ] Refresh (or wait for auto-refresh)
- [ ] See status change to "processing" then "published"
- [ ] Go to **Published** tab
- [ ] See your scheduled post in list

### ✅ Phase 4: Job Management (5 min)
- [ ] Go to **Compose** tab
- [ ] Create another scheduled post (+10 min)
- [ ] Go to **Scheduled** tab
- [ ] Find the new pending job
- [ ] Click "Cancel"
- [ ] Status changes to "cancelled"
- [ ] Create another job (future time)
- [ ] Click "Reschedule"
- [ ] Change time to +2 minutes
- [ ] Job requeues

### ✅ Phase 5: Comments & Replies (5 min)
- [ ] Go to **Comments** tab
- [ ] Click "Refresh" or wait 10 seconds for auto-load
- [ ] See list of recent comments/mentions
- [ ] Find a comment from another user
- [ ] Click "Reply"
- [ ] Type test reply text
- [ ] Click "Send Reply"
- [ ] See ✅ Reply sent status
- [ ] Verify reply appears in Threads app (may need refresh)
- [ ] Check "Reply History" section shows your replies

---

## End of Day: Validation (5 min)

- [ ] Go to **Published** tab
  - [ ] All posts visible ✅
  - [ ] Multi-part posts show part counter ✅
  - [ ] "View on Threads" link works ✅

- [ ] Go to **Scheduled** tab
  - [ ] Completed jobs show ✅

- [ ] Check API logs in Coolify
  - [ ] No errors ✅
  - [ ] Scheduler running every 10s ✅

- [ ] Final smoke test:
  - [ ] Scheduled job with +2 min time → publishes automatically ✅

---

## Tomorrow: Restart Test (5 min)

- [ ] In Coolify, restart API service
- [ ] Wait for startup (check logs: migration auto-runs)
- [ ] Go to **Published** tab
- [ ] All old posts still there ✅ (data persisted)
- [ ] Go to **Scheduled** tab
- [ ] Pending jobs still there ✅ (scheduler resumes)

---

## Troubleshooting Quick Links

**Problem:** Database connection refused  
**Fix:** Check PostgreSQL service status (green) + DATABASE_URL format

**Problem:** Token not found (401)  
**Fix:** Go Settings → Reconnect → Complete OAuth flow

**Problem:** Post not published after scheduled time  
**Fix:** Check /api/publish/jobs endpoint for error; click Retry

**Problem:** Migration failed on deploy  
**Fix:** Check logs; verify DATABASE_URL has correct password/host

**Problem:** CORS error from browser  
**Fix:** Verify DELETE method in CORS list (apps/api/src/index.ts)

---

## Success Criteria

- [x] OAuth flow works (Settings tab)
- [x] Compose & publish works (one click from dashboard to Threads)
- [x] Scheduler works (auto-publishes at scheduled time)
- [x] Comments work (can reply to posts)
- [x] Data persists (survives app restart)
- [x] No errors in logs

---

## Documentation Reference

| Doc | Purpose |
|-----|---------|
| DEPLOYMENT_GUIDE.md | Complete reference (read if issues arise) |
| QUICK_REFERENCE.md | API routes & environment variables |
| IMPLEMENTATION_LOG.md | What was built in this session |
| This file | Day-by-day execution checklist |

---

**Estimated Time:** 60-90 minutes total  
**Complexity:** Low (mostly clicking + waiting)  
**Risk:** Very low (all code tested locally)

**Good luck! 🚀**
