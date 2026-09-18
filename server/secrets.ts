/**
 * Secret manager — fail-safe.
 * Without SECRETS_ENCRYPTION_KEY, secrets are NEVER persisted as plaintext.
 * Callers must treat NOT_CONFIGURED as "do not store".
 */
import crypto from "node:crypto";
import { ENV } from "./_core/env";

const ALGO = "aes-256-gcm";

function keyBytes(): Buffer | null {
  // Read process.env at call time so preflight/tests can set the key after module load
  const hex = (process.env.SECRETS_ENCRYPTION_KEY || ENV.secretsEncryptionKey || "").trim();
  if (!hex || hex.length < 64) return null;
  try {
    return Buffer.from(hex.slice(0, 64), "hex");
  } catch {
    return null;
  }
}

export function isSecretsEncryptionConfigured(): boolean {
  return Boolean(keyBytes());
}

export type EncryptResult =
  | { status: "OK"; payload: string }
  | { status: "NOT_CONFIGURED"; error: string };

/** Encrypt UTF-8 secret. Never returns plaintext payload. */
export function encryptSecret(plain: string): EncryptResult {
  const key = keyBytes();
  if (!key) {
    return {
      status: "NOT_CONFIGURED",
      error: "SECRETS_ENCRYPTION_KEY missing or invalid (need 64 hex chars). Secret will not be persisted.",
    };
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    status: "OK",
    payload: `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`,
  };
}

export function decryptSecret(payload: string): string {
  if (payload.startsWith("plain:")) {
    throw new Error("Refusing to decrypt legacy plaintext secret payload. Rotate SECRETS_ENCRYPTION_KEY and re-provision.");
  }
  const key = keyBytes();
  if (!key) throw new Error("SECRETS_ENCRYPTION_KEY not configured; cannot decrypt");
  const parts = payload.split(":");
  if (parts[0] !== "v1" || parts.length !== 4) throw new Error("Invalid secret payload");
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

export function generateSecret(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/** SHA-256 hex checksum of source string (for version lock / isolation proofs) */
export function checksumSource(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}
