import { Router } from "express";
import { z } from "zod";
import { tokenStore } from "../services/tokenStore.js";
import { threadsClient } from "../services/threadsClient.js";
import { scheduler } from "../services/scheduler.js";
import { splitHtmlToThreads } from "../services/htmlSplitter.js";
import { prisma } from "../lib/prisma.js";

export const publishRouter = Router();

const publishSchema = z.object({
  text: z.string().min(1).max(500),
  imageUrl: z.string().url().optional(),
  parts: z.array(z.string()).optional()
});

const scheduleSchema = publishSchema.extend({
  scheduledAt: z.string().datetime()
});

const previewSplitSchema = z.object({
  html: z.string().min(1)
});

publishRouter.post("/now", async (req, res) => {
  const token = await tokenStore.get();
  if (!token) {
    return res.status(401).json({ error: "Threads account not connected" });
  }

  const parsed = publishSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const userId = await tokenStore.getUserId();
    const parts = parsed.data.parts;
    let postId: string;

    if (parts && parts.length > 1) {
      postId = await threadsClient.publishThread(token, parts, parsed.data.imageUrl);
    } else {
      const result = await threadsClient.publishNow(token, parsed.data.text, parsed.data.imageUrl);
      postId = result.id;
    }

    // Save to DB
    await prisma.publishJob.create({
      data: {
        userId: userId!,
        text: parsed.data.text,
        imageUrl: parsed.data.imageUrl,
        parts: parts ?? undefined,
        status: "PUBLISHED",
        threadsPostId: postId
      }
    });

    return res.json({ success: true, postId });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to publish" });
  }
});

publishRouter.post("/preview-split", (req, res) => {
  const parsed = previewSplitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const parts = splitHtmlToThreads(parsed.data.html);
    return res.json({ parts, count: parts.length });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to split HTML" });
  }
});

publishRouter.post("/schedule", async (req, res) => {
  const token = await tokenStore.get();
  if (!token) {
    return res.status(401).json({ error: "Threads account not connected" });
  }

  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const userId = await tokenStore.getUserId();
    const job = await scheduler.schedule(userId!, parsed.data.text, parsed.data.scheduledAt, {
      imageUrl: parsed.data.imageUrl,
      parts: parsed.data.parts
    });
    return res.json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to schedule" });
  }
});

publishRouter.get("/jobs", async (_req, res) => {
  try {
    const userId = await tokenStore.getUserId();
    const jobs = await scheduler.list(userId ?? undefined);
    return res.json({ jobs });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list jobs" });
  }
});

publishRouter.delete("/jobs/:id", async (req, res) => {
  try {
    const job = await scheduler.cancel(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found or already processed" });
    }
    return res.json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to cancel job" });
  }
});

publishRouter.post("/jobs/:id/retry", async (req, res) => {
  try {
    const job = await scheduler.retry(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found or not in failed state" });
    }
    return res.json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to retry job" });
  }
});

publishRouter.post("/jobs/:id/reschedule", async (req, res) => {
  const parsed = z.object({ scheduledAt: z.string().datetime() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const job = await scheduler.reschedule(req.params.id, parsed.data.scheduledAt);
    if (!job) {
      return res.status(404).json({ error: "Job not found or invalid status" });
    }
    return res.json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to reschedule job" });
  }
});

publishRouter.get("/posts", async (_req, res) => {
  try {
    const userId = await tokenStore.getUserId();
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const posts = await prisma.publishJob.findMany({
      where: { userId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ posts });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list posts" });
  }
});
