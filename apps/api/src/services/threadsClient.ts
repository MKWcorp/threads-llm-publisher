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
}

export const threadsClient = new ThreadsClient();
