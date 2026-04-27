import crypto from "node:crypto";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import type { OAuthToken } from "../types.js";

const algorithm = "aes-256-gcm";
const key = crypto.createHash("sha256").update(config.ENCRYPTION_MASTER_KEY).digest();

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decrypt(value: string) {
  const data = Buffer.from(value, "base64");
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export const tokenStore = {
  async save(token: OAuthToken) {
    const encrypted = encrypt(token.accessToken);
    await prisma.user.upsert({
      where: { threadsUserId: token.threadsUserId },
      create: {
        threadsUserId: token.threadsUserId,
        token: {
          create: { accessToken: encrypted, expiresAt: BigInt(token.expiresAt) }
        }
      },
      update: {
        token: {
          upsert: {
            create: { accessToken: encrypted, expiresAt: BigInt(token.expiresAt) },
            update: { accessToken: encrypted, expiresAt: BigInt(token.expiresAt) }
          }
        }
      }
    });
  },

  async get(): Promise<OAuthToken | null> {
    const row = await prisma.token.findFirst({ include: { user: true } });
    if (!row) return null;
    return {
      accessToken: decrypt(row.accessToken),
      expiresAt: Number(row.expiresAt),
      threadsUserId: row.user.threadsUserId
    };
  },

  async isConnected(): Promise<boolean> {
    const count = await prisma.token.count();
    return count > 0;
  },

  async getUserId(): Promise<string | null> {
    const row = await prisma.token.findFirst({ include: { user: true } });
    return row?.user.id ?? null;
  }
};
