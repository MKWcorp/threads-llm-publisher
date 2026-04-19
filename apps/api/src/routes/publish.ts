import { Router } from "express";
import { z } from "zod";
import { tokenStore } from "../services/tokenStore.js";
import { threadsClient } from "../services/threadsClient.js";
import { scheduler } from "../services/scheduler.js";

export const publishRouter = Router();

const publishSchema = z.object({
  text: z.string().min(1).max(500),
  imageUrl: z.string().url().optional()
});

const scheduleSchema = publishSchema.extend({
  scheduledAt: z.string().datetime()
});

publishRouter.post("/now", async (req, res) => {
  const token = tokenStore.get();
  if (!token) {
    return res.status(401).json({ error: "Threads account not connected" });
  }

  const parsed = publishSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await threadsClient.publishNow(token, parsed.data.text, parsed.data.imageUrl);
    return res.json({ success: true, postId: result.id });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to publish" });
  }
});

publishRouter.post("/schedule", (req, res) => {
  const token = tokenStore.get();
  if (!token) {
    return res.status(401).json({ error: "Threads account not connected" });
  }

  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const job = scheduler.schedule(parsed.data.text, parsed.data.scheduledAt, parsed.data.imageUrl);
  return res.json({ success: true, job });
});

publishRouter.get("/jobs", (_req, res) => {
  return res.json({ jobs: scheduler.list() });
});
