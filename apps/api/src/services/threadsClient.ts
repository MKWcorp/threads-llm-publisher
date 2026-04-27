import type { OAuthToken } from "../types.js";

const BASE = "https://graph.threads.net/v1.0";

interface CreateContainerInput {
  threadsUserId: string;
  accessToken: string;
  text: string;
  imageUrl?: string;
}

interface ThreadsApiError {
  error?: { message: string; code: number };
}

async function assertOk(res: Response, label: string) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as ThreadsApiError;
    throw new Error(`${label}: ${body.error?.message ?? res.statusText}`);
  }
}

export class ThreadsClient {
  async createContainer(input: CreateContainerInput): Promise<{ id: string }> {
    if (!input.text?.trim()) throw new Error("Text is required");
    if (input.text.length > 500) throw new Error("Threads text limit is 500 characters");

    const params = new URLSearchParams({
      media_type: input.imageUrl ? "IMAGE" : "TEXT",
      text: input.text,
      access_token: input.accessToken
    });
    if (input.imageUrl) params.set("image_url", input.imageUrl);

    const res = await fetch(`${BASE}/${input.threadsUserId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    await assertOk(res, "createContainer");
    return res.json() as Promise<{ id: string }>;
  }

  async publishContainer(params: { threadsUserId: string; accessToken: string; creationId: string }): Promise<{ id: string }> {
    if (!params.creationId) throw new Error("creationId is required");

    const body = new URLSearchParams({
      creation_id: params.creationId,
      access_token: params.accessToken
    });

    const res = await fetch(`${BASE}/${params.threadsUserId}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    await assertOk(res, "publishContainer");
    return res.json() as Promise<{ id: string }>;
  }

  async publishNow(token: OAuthToken, text: string, imageUrl?: string) {
    const container = await this.createContainer({
      threadsUserId: token.threadsUserId,
      accessToken: token.accessToken,
      text,
      imageUrl
    });

    // Threads requires a short delay between container creation and publish
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return this.publishContainer({
      threadsUserId: token.threadsUserId,
      accessToken: token.accessToken,
      creationId: container.id
    });
  }

  /**
   * Publish an ordered array of thread parts as a reply chain.
   * Returns the root post ID.
   */
  async publishThread(token: OAuthToken, parts: string[], imageUrl?: string): Promise<string> {
    if (!parts.length) throw new Error("Thread parts cannot be empty");

    let rootPostId: string | null = null;
    let previousPostId: string | null = null;

    for (let i = 0; i < parts.length; i++) {
      const text = parts[i];
      const isFirst = i === 0;

      const params = new URLSearchParams({
        media_type: isFirst && imageUrl ? "IMAGE" : "TEXT",
        text,
        access_token: token.accessToken
      });
      if (isFirst && imageUrl) params.set("image_url", imageUrl);
      if (previousPostId) params.set("reply_to_id", previousPostId);

      const containerRes = await fetch(`${BASE}/${token.threadsUserId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
      });
      await assertOk(containerRes, `createContainer[${i}]`);
      const container = await containerRes.json() as { id: string };

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const publishRes = await fetch(`${BASE}/${token.threadsUserId}/threads_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: container.id,
          access_token: token.accessToken
        })
      });
      await assertOk(publishRes, `publishContainer[${i}]`);
      const published = await publishRes.json() as { id: string };

      if (isFirst) rootPostId = published.id;
      previousPostId = published.id;

      // Short delay between parts to avoid rate limiting
      if (i < parts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return rootPostId!;
  }

  /**
   * Fetch comments/replies for a post.
   */
  async getConversation(token: OAuthToken, postId: string): Promise<{ data: { id: string; text: string; username?: string; timestamp: string }[] }> {
    const res = await fetch(
      `${BASE}/${postId}/conversation?fields=id,text,username,timestamp&access_token=${token.accessToken}`
    );
    await assertOk(res, "getConversation");
    return res.json() as Promise<{ data: { id: string; text: string; username?: string; timestamp: string }[] }>;
  }

  /**
   * Reply to a specific Threads comment.
   */
  async replyToComment(token: OAuthToken, replyToId: string, text: string): Promise<{ id: string }> {
    const params = new URLSearchParams({
      media_type: "TEXT",
      text,
      reply_to_id: replyToId,
      access_token: token.accessToken
    });

    const containerRes = await fetch(`${BASE}/${token.threadsUserId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    await assertOk(containerRes, "replyToComment:createContainer");
    const container = await containerRes.json() as { id: string };

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const publishRes = await fetch(`${BASE}/${token.threadsUserId}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id: container.id,
        access_token: token.accessToken
      })
    });
    await assertOk(publishRes, "replyToComment:publish");
    return publishRes.json() as Promise<{ id: string }>;
  }
}

export const threadsClient = new ThreadsClient();
