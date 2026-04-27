export type PublishStatus = "pending" | "processing" | "published" | "failed" | "cancelled";

export interface OAuthToken {
  accessToken: string;
  expiresAt: number;
  threadsUserId: string;
}

export interface PublishJob {
  id: string;
  text: string;
  imageUrl?: string;
  parts?: string[];         // multi-part thread utas
  scheduledAt?: string;
  status: PublishStatus;
  error?: string;
  threadsPostId?: string;   // returned by Threads API
  createdAt?: string;
  updatedAt?: string;
}

export interface Draft {
  id: string;
  htmlInput: string;
  parts: string[];
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  threadsCommentId: string;
  text: string;
  username?: string;
  repliedAt?: string;
  replyText?: string;
  createdAt?: string;
}
