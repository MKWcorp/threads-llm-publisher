import crypto from "node:crypto";
import { config } from "../config.js";
import type { OAuthToken } from "../types.js";

let encryptedTokenBlob: string | null = null;

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
  save(token: OAuthToken) {
    encryptedTokenBlob = encrypt(JSON.stringify(token));
  },
  get(): OAuthToken | null {
    if (!encryptedTokenBlob) return null;
    return JSON.parse(decrypt(encryptedTokenBlob)) as OAuthToken;
  },
  isConnected() {
    return !!encryptedTokenBlob;
  }
};
