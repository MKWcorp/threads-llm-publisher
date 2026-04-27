import { prisma } from "../lib/prisma.js";
import { threadsClient } from "./threadsClient.js";
import { tokenStore } from "./tokenStore.js";
import type { PublishJob } from "../types.js";

function toPublishJob(row: {
  id: string;
  text: string;
  imageUrl: string | null;
  parts: unknown;
  scheduledAt: Date | null;
  status: string;
  error: string | null;
  threadsPostId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PublishJob {
  return {
    id: row.id,
    text: row.text,
    imageUrl: row.imageUrl ?? undefined,
    parts: Array.isArray(row.parts) ? (row.parts as string[]) : undefined,
    scheduledAt: row.scheduledAt?.toISOString(),
    status: row.status.toLowerCase() as PublishJob["status"],
    error: row.error ?? undefined,
    threadsPostId: row.threadsPostId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

// Poll every 10 s, claim-then-publish pattern to be restart-safe
setInterval(async () => {
  const token = await tokenStore.get();
  if (!token) return;

  const now = new Date();

  // Claim one pending job atomically
  const claimed = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "PublishJob"
    SET status = 'PROCESSING', "updatedAt" = now()
    WHERE id = (
      SELECT id FROM "PublishJob"
      WHERE status = 'PENDING'
        AND "scheduledAt" IS NOT NULL
        AND "scheduledAt" <= ${now}
      ORDER BY "scheduledAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `;

  if (!claimed.length) return;
  const jobId = claimed[0].id;

  const job = await prisma.publishJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  try {
    const parts = Array.isArray(job.parts) ? (job.parts as string[]) : null;
    let postId: string;

    if (parts && parts.length > 1) {
      postId = await threadsClient.publishThread(token, parts, job.imageUrl ?? undefined);
    } else {
      const result = await threadsClient.publishNow(token, job.text, job.imageUrl ?? undefined);
      postId = result.id;
    }

    await prisma.publishJob.update({
      where: { id: jobId },
      data: { status: "PUBLISHED", threadsPostId: postId, error: null }
    });
  } catch (err) {
    await prisma.publishJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : "Unknown error"
      }
    });
  }
}, 10_000);

export const scheduler = {
  async schedule(
    userId: string,
    text: string,
    scheduledAt: string,
    options?: { imageUrl?: string; parts?: string[] }
  ): Promise<PublishJob> {
    const row = await prisma.publishJob.create({
      data: {
        userId,
        text,
        imageUrl: options?.imageUrl,
        parts: options?.parts ?? undefined,
        scheduledAt: new Date(scheduledAt),
        status: "PENDING"
      }
    });
    return toPublishJob(row);
  },

  async list(userId?: string): Promise<PublishJob[]> {
    const rows = await prisma.publishJob.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { scheduledAt: "asc" }
    });
    return rows.map(toPublishJob);
  },

  async cancel(id: string): Promise<PublishJob | null> {
    const job = await prisma.publishJob.findUnique({ where: { id } });
    if (!job || job.status !== "PENDING") return null;
    const updated = await prisma.publishJob.update({
      where: { id },
      data: { status: "CANCELLED" }
    });
    return toPublishJob(updated);
  },

  async retry(id: string): Promise<PublishJob | null> {
    const job = await prisma.publishJob.findUnique({ where: { id } });
    if (!job || job.status !== "FAILED") return null;
    const updated = await prisma.publishJob.update({
      where: { id },
      data: { status: "PENDING", error: null }
    });
    return toPublishJob(updated);
  },

  async reschedule(id: string, scheduledAt: string): Promise<PublishJob | null> {
    const job = await prisma.publishJob.findUnique({ where: { id } });
    if (!job || !["PENDING", "FAILED"].includes(job.status)) return null;
    const updated = await prisma.publishJob.update({
      where: { id },
      data: { scheduledAt: new Date(scheduledAt), status: "PENDING", error: null }
    });
    return toPublishJob(updated);
  }
};
