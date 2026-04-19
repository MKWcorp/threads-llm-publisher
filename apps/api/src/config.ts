import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: "../../.env" });

const configSchema = z.object({
  PORT: z.coerce.number().default(8787),
  APP_BASE_URL: z.string().url().default("http://localhost:8787"),
  WEB_BASE_URL: z.string().url().default("http://localhost:5173"),
  THREADS_APP_ID: z.string().default(""),
  THREADS_APP_SECRET: z.string().default(""),
  THREADS_REDIRECT_URI: z.string().url().default("http://localhost:8787/auth/threads/callback"),
  THREADS_SCOPES: z.string().default("threads_basic,threads_content_publish"),
  ENCRYPTION_MASTER_KEY: z.string().min(16).default("local-dev-key-change-me")
});

export const config = configSchema.parse(process.env);
