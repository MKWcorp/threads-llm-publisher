import { Router } from "express";
import { z } from "zod";
import { tokenStore } from "../services/tokenStore.js";
import { threadsClient } from "../services/threadsClient.js";
import { prisma } from "../lib/prisma.js";

export const commentsRouter = Router();

const replySchema = z.object({
  replyToId: z.string().min(1),
  text: z.string().min(1).max(500)
});

/**
 * GET /comments — list recent comments/mentions on account's posts
 */
commentsRouter.get("/", async (req, res) => {
  const token = await tokenStore.get();
  if (!token) {
    return res.status(401).json({ error: "Threads account not connected" });
  }

  try {
    // Fetch from Threads API
    const response = await fetch(
      `https://graph.threads.net/v1.0/${token.threadsUserId}/threads?fields=id,text,conversation&access_token=${token.accessToken}`
    );
    if (!response.ok) {
      throw new Error(`Threads API error: ${response.statusText}`);
    }
    const data = await response.json() as { data: { id: string; text: string; conversation?: unknown }[] };

    return res.json({ comments: data.data ?? [] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch comments" });
  }
});

/**
 * POST /comments/:id/reply — reply to a specific comment
 */
commentsRouter.post("/:id/reply", async (req, res) => {
  const token = await tokenStore.get();
  if (!token) {
    return res.status(401).json({ error: "Threads account not connected" });
  }

  const parsed = replySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const userId = await tokenStore.getUserId();

    // Call Threads API to post reply
    const result = await threadsClient.replyToComment(token, parsed.data.replyToId, parsed.data.text);

    // Save reply record to DB
    await prisma.comment.create({
      data: {
        userId: userId!,
        threadsCommentId: result.id,
        text: parsed.data.text,
        replyText: parsed.data.text,
        repliedAt: new Date()
      }
    });

    return res.json({ success: true, commentId: result.id });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to reply" });
  }
});

/**
 * GET /comments/history — list all replies user has sent
 */
commentsRouter.get("/history", async (_req, res) => {
  try {
    const userId = await tokenStore.getUserId();
    const comments = await prisma.comment.findMany({
      where: { userId, repliedAt: { not: null } },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ comments });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch history" });
  }
});
