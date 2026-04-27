import { Router } from "express";
import { config } from "../config.js";
import { tokenStore } from "../services/tokenStore.js";

export const authRouter = Router();

function buildThreadsAuthUrl() {
  const url = new URL("https://threads.net/oauth/authorize");
  url.searchParams.set("client_id", config.THREADS_APP_ID);
  url.searchParams.set("redirect_uri", config.THREADS_REDIRECT_URI);
  url.searchParams.set("scope", config.THREADS_SCOPES);
  url.searchParams.set("response_type", "code");

  return url.toString();
}

authRouter.get("/threads/start", (_req, res) => {
  res.json({ authUrl: buildThreadsAuthUrl() });
});

authRouter.get("/threads/start/redirect", (_req, res) => {
  return res.redirect(buildThreadsAuthUrl());
});

authRouter.get("/threads/callback", async (req, res) => {
  const oauthErrorMessage = String(req.query.error_message || req.query.error || "");
  if (oauthErrorMessage) {
    return res.redirect(`${config.WEB_BASE_URL}/?error=${encodeURIComponent(oauthErrorMessage)}`);
  }

  const code = String(req.query.code || "");
  if (!code) {
    return res.redirect(`${config.WEB_BASE_URL}/?error=${encodeURIComponent("Missing authorization code")}`);
  }

  try {
    // Step 1: Exchange code for short-lived token
    const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.THREADS_APP_ID,
        client_secret: config.THREADS_APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: config.THREADS_REDIRECT_URI,
        code
      })
    });

    const tokenData = await tokenRes.json() as { access_token?: string; user_id?: number; error_message?: string };
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_message || "Failed to obtain access token");
    }

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    const longLivedRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${config.THREADS_APP_SECRET}&access_token=${tokenData.access_token}`
    );
    const longLivedData = await longLivedRes.json() as { access_token?: string; expires_in?: number; error?: { message: string } };

    const accessToken = longLivedData.access_token ?? tokenData.access_token;
    const expiresIn = longLivedData.expires_in ?? 60 * 24 * 60 * 60; // default 60 days in seconds
    
    // Step 3: Get the actual Threads user ID by calling /me
    const meRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id&access_token=${accessToken}`);
    const meData = await meRes.json() as { id?: string; error?: { message: string } };
    if (!meData.id) {
      throw new Error(meData.error?.message || "Failed to fetch Threads user ID");
    }

    tokenStore.save({
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      threadsUserId: meData.id
    }).catch(() => {
      throw new Error("Failed to save token to database");
    });

    return res.redirect(`${config.WEB_BASE_URL}/?connected=true`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.redirect(`${config.WEB_BASE_URL}/?error=${encodeURIComponent(message)}`);
  }
});

authRouter.get("/threads/status", async (_req, res) => {
  const token = await tokenStore.get();
  return res.json({
    connected: token ? true : false,
    userId: token?.threadsUserId ?? null,
    expiresAt: token?.expiresAt ?? null
  });
});

authRouter.get("/threads/uninstall", (_req, res) => {
  return res.status(200).json({ ok: true });
});

authRouter.post("/threads/uninstall", (_req, res) => {
  return res.status(200).json({ ok: true });
});

authRouter.get("/threads/delete", (_req, res) => {
  return res.status(200).json({
    url: `${config.WEB_BASE_URL}/data-deletion`,
    confirmation_code: `del_${Date.now()}`
  });
});

authRouter.post("/threads/delete", (_req, res) => {
  return res.status(200).json({
    url: `${config.WEB_BASE_URL}/data-deletion`,
    confirmation_code: `del_${Date.now()}`
  });
});
