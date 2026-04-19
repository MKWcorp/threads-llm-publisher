export type PublishStatus = "pending" | "processing" | "published" | "failed";

export interface OAuthToken {
  accessToken: string;
  expiresAt: number;
  threadsUserId: string;
}

export interface PublishJob {
  id: string;
  text: string;
  imageUrl?: string;
  scheduledAt?: string;
  status: PublishStatus;
  error?: string;
}
