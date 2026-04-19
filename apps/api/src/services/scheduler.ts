import { randomUUID } from "node:crypto";
import { threadsClient } from "./threadsClient.js";
import { tokenStore } from "./tokenStore.js";
import type { PublishJob } from "../types.js";

const jobs = new Map<string, PublishJob>();

setInterval(async () => {
  const now = Date.now();
  const token = tokenStore.get();
  if (!token) return;

  for (const [id, job] of jobs.entries()) {
    if (job.status !== "pending" || !job.scheduledAt) continue;
    if (new Date(job.scheduledAt).getTime() > now) continue;

    try {
      jobs.set(id, { ...job, status: "processing" });
      await threadsClient.publishNow(token, job.text, job.imageUrl);
      jobs.set(id, { ...job, status: "published" });
    } catch (error) {
      jobs.set(id, {
        ...job,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}, 10000);

export const scheduler = {
  schedule(text: string, scheduledAt: string, imageUrl?: string) {
    const id = randomUUID();
    const job: PublishJob = {
      id,
      text,
      imageUrl,
      scheduledAt,
      status: "pending"
    };
    jobs.set(id, job);
    return job;
  },
  list() {
    return Array.from(jobs.values()).sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""));
  }
};
