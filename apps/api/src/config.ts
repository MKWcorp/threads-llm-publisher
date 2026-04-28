import dotenv from "dotenv";
import { z } from "zod";

// Load .env only in local dev; in production (Docker/Coolify) env vars are injected directly
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: new URL("../../../.env", import.meta.url).pathname });
}

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  WEB_BASE_URL: z.string().url().default("http://localhost:5173"),
  THREADS_APP_ID: z.string().default(""),
  THREADS_APP_SECRET: z.string().default(""),
  THREADS_REDIRECT_URI: z.string().url().default("http://localhost:3000/auth/threads/callback"),
  THREADS_SCOPES: z.string().default("threads_basic,threads_content_publish,threads_manage_replies"),
  ENCRYPTION_MASTER_KEY: z.string().min(16).default("local-dev-key-change-me"),
  DATABASE_URL: z.string().optional().default("")
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
