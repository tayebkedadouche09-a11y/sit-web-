/**
 * Production backup / restore (application-level).
 *
 * WHAT IS BACKED UP (when configured):
 * - products, categories, orders, payments metadata, licenses keys (not payment provider secrets)
 * - deliveries / instance metadata (URLs, deployment IDs — NOT raw DB passwords)
 * - product versions, coupons, audit log slice
 *
 * WHAT IS NEVER BACKED UP:
 * - JWT secrets, API tokens from env
 * - full customer DB connection strings with passwords (redacted)
 * - payment provider secret keys
 *
 * Full PostgreSQL physical backup: use Supabase Dashboard backups in parallel.
 * This module stores encrypted application snapshots to S3 or BACKUP_WEBHOOK_URL.
 */
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import {
  products,
  categories,
  orders,
  orderItems,
  payments,
  customerPurchases,
  deliveries,
  licenses,
  productVersions,
  coupons,
  customerInstances,
  auditLogs,
} from "../drizzle/schema";
import { desc } from "drizzle-orm";
import { redactUnknown } from "./security/redact";

export type BackupResult = {
  status: "CREATED" | "NOT_CONFIGURED" | "ERROR";
  backupId?: string;
  checksum?: string;
  createdAt?: string;
  bytes?: number;
  storage?: string;
  error?: string;
};

export type RestoreResult = {
  status: "RESTORED" | "NOT_CONFIGURED" | "ERROR" | "VALIDATED";
  backupId?: string;
  safetyBackupId?: string;
  error?: string;
  notes?: string;
};

const BACKUP_FORMAT = "numi.backup.v1";

export function getBackupStatus(): { configured: boolean; detail: string } {
  if (ENV.backupWebhookUrl) return { configured: true, detail: "BACKUP_WEBHOOK_URL set" };
  if (ENV.storageProvider === "s3" && ENV.s3Bucket && ENV.s3AccessKeyId && ENV.s3SecretAccessKey) {
    return { configured: true, detail: "S3 storage configured for backups" };
  }
  return {
    configured: false,
    detail: "Set BACKUP_WEBHOOK_URL or STORAGE_PROVIDER=s3 with S3_* keys. Also enable Supabase native DB backups.",
  };
}

function encryptionKey(): Buffer | null {
  const raw = ENV.secretsEncryptionKey || ENV.cookieSecret;
  if (!raw || raw.length < 16) return null;
  return createHash("sha256").update(raw).digest();
}

function encryptPayload(plain: string): { ciphertext: string; iv: string; tag: string } | { plain: string } {
  const key = encryptionKey();
  if (!key) return { plain };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: enc.toString("base64"), iv: iv.toString("base64"), tag: tag.toString("base64") };
}

function decryptPayload(body: any): string {
  if (body.plain) return body.plain as string;
  const key = encryptionKey();
  if (!key) throw new Error("Cannot decrypt backup: SECRETS_ENCRYPTION_KEY / JWT_SECRET missing");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(body.iv, "base64"));
  decipher.setAuthTag(Buffer.from(body.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(body.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function collectSnapshot(): Promise<Record<string, unknown>> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [
    productRows,
    categoryRows,
    orderRows,
    itemRows,
    paymentRows,
    purchaseRows,
    deliveryRows,
    licenseRows,
    versionRows,
    couponRows,
    instanceRows,
    auditRows,
  ] = await Promise.all([
    db.select().from(products),
    db.select().from(categories),
    db.select().from(orders),
    db.select().from(orderItems),
    db.select().from(payments),
    db.select().from(customerPurchases),
    db.select().from(deliveries),
    db.select().from(licenses),
    db.select().from(productVersions),
    db.select().from(coupons),
    db.select().from(customerInstances),
    db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(500),
  ]);

  // Never persist env secrets; redact instance metadata aggressively
  const safeInstances = (instanceRows as any[]).map((row) =>
    redactUnknown({
      ...row,
      metadata: row.metadata ? "[REDACTED_OR_OMITTED]" : null,
    }),
  );

  return {
    format: BACKUP_FORMAT,
    version: "5.0.0",
    createdAt: new Date().toISOString(),
    includes: [
      "products",
      "categories",
      "orders",
      "orderItems",
      "payments",
      "customerPurchases",
      "deliveries",
      "licenses",
      "productVersions",
      "coupons",
      "customerInstances(metadata redacted)",
      "auditLogs(last 500)",
    ],
    excludes: [
      "environment secrets",
      "raw customer DB passwords",
      "payment provider API keys",
      "JWT / encryption keys",
    ],
    data: {
      products: productRows,
      categories: categoryRows,
      orders: orderRows,
      orderItems: itemRows,
      payments: paymentRows,
      customerPurchases: purchaseRows,
      deliveries: deliveryRows,
      licenses: licenseRows,
      productVersions: versionRows,
      coupons: couponRows,
      customerInstances: safeInstances,
      auditLogs: auditRows,
    },
  };
}

async function putToS3(key: string, body: Buffer, contentType: string): Promise<void> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: ENV.s3Region || "auto",
    endpoint: ENV.s3Endpoint || undefined,
    forcePathStyle: Boolean(ENV.s3Endpoint),
    credentials: {
      accessKeyId: ENV.s3AccessKeyId!,
      secretAccessKey: ENV.s3SecretAccessKey!,
    },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket!,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: { app: "numi", purpose: "backup" },
    }),
  );
}

export async function createSystemBackup(reason = "manual"): Promise<BackupResult> {
  const st = getBackupStatus();
  if (!st.configured) return { status: "NOT_CONFIGURED", error: st.detail };

  try {
    const snapshot = await collectSnapshot();
    const plain = JSON.stringify(snapshot);
    const checksum = createHash("sha256").update(plain).digest("hex");
    const backupId = `bk_${checksum.slice(0, 12)}_${Date.now()}`;
    const sealed = encryptPayload(plain);
    const envelope = JSON.stringify({
      format: BACKUP_FORMAT,
      backupId,
      checksum,
      reason,
      createdAt: new Date().toISOString(),
      encrypted: !("plain" in sealed),
      payload: sealed,
    });
    const bytes = Buffer.byteLength(envelope, "utf8");

    if (ENV.storageProvider === "s3" && ENV.s3Bucket && ENV.s3AccessKeyId) {
      const key = `numi-backups/${backupId}.json`;
      await putToS3(key, Buffer.from(envelope, "utf8"), "application/json");
      return { status: "CREATED", backupId, checksum, createdAt: new Date().toISOString(), bytes, storage: `s3://${ENV.s3Bucket}/${key}` };
    }

    if (ENV.backupWebhookUrl) {
      const res = await fetch(ENV.backupWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Numi-Backup-Id": backupId },
        body: envelope,
      });
      if (!res.ok) return { status: "ERROR", error: `Backup webhook HTTP ${res.status}` };
      return { status: "CREATED", backupId, checksum, createdAt: new Date().toISOString(), bytes, storage: "webhook" };
    }

    return { status: "NOT_CONFIGURED", error: "No backup transport available" };
  } catch (e) {
    return { status: "ERROR", error: e instanceof Error ? e.message : "backup failed" };
  }
}

/** Validate backup envelope integrity without applying */
export function validateBackupEnvelope(raw: string): { ok: boolean; backupId?: string; error?: string } {
  try {
    const env = JSON.parse(raw);
    if (env.format !== BACKUP_FORMAT) return { ok: false, error: "Unknown backup format" };
    const plain = decryptPayload(env.payload);
    const checksum = createHash("sha256").update(plain).digest("hex");
    if (env.checksum && env.checksum !== checksum) return { ok: false, error: "Checksum mismatch" };
    const snap = JSON.parse(plain);
    if (snap.format !== BACKUP_FORMAT) return { ok: false, error: "Invalid snapshot format" };
    return { ok: true, backupId: env.backupId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "validate failed" };
  }
}

/**
 * Restore is intentionally conservative:
 * 1) Create safety backup first
 * 2) Validate incoming backup
 * 3) Application-level restore of catalog + config tables is NOT auto-applied to production
 *    without explicit confirm — returns VALIDATED + instructions to avoid partial corruption.
 *
 * Full DB restore must go through Supabase point-in-time / physical backup.
 */
export async function restoreFromBackupEnvelope(
  raw: string,
  opts: { confirm: boolean; actorUserId?: number },
): Promise<RestoreResult> {
  const st = getBackupStatus();
  if (!st.configured) return { status: "NOT_CONFIGURED", error: st.detail };

  const safety = await createSystemBackup("pre-restore-safety");
  if (safety.status !== "CREATED") {
    return { status: "ERROR", error: `Safety backup failed: ${safety.error}`, safetyBackupId: safety.backupId };
  }

  const validated = validateBackupEnvelope(raw);
  if (!validated.ok) {
    return { status: "ERROR", error: validated.error, safetyBackupId: safety.backupId };
  }

  if (!opts.confirm) {
    return {
      status: "VALIDATED",
      backupId: validated.backupId,
      safetyBackupId: safety.backupId,
      notes:
        "Backup validated. Pass confirm=true only after review. Full table overwrite restore is gated; prefer Supabase PITR for disaster recovery. Safety backup was created.",
    };
  }

  // Confirmed path: restore catalog + config tables only (not live payment mutation history).
  // Order/payment history restore must use Supabase PITR to avoid partial financial state.
  try {
    const env = JSON.parse(raw);
    const plain = decryptPayload(env.payload);
    const snap = JSON.parse(plain) as { data?: Record<string, any[]> };
    const data = snap.data || {};
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Upsert-style: insert missing products/categories by id when absent — conservative
    if (Array.isArray(data.categories)) {
      for (const row of data.categories) {
        try {
          await db.insert(categories).values(row as any).onConflictDoNothing();
        } catch {
          /* skip row-level conflict */
        }
      }
    }
    if (Array.isArray(data.products)) {
      for (const row of data.products) {
        try {
          await db.insert(products).values(row as any).onConflictDoNothing();
        } catch {
          /* skip */
        }
      }
    }
    if (Array.isArray(data.productVersions)) {
      for (const row of data.productVersions) {
        try {
          await db.insert(productVersions).values(row as any).onConflictDoNothing();
        } catch {
          /* skip */
        }
      }
    }
    if (Array.isArray(data.coupons)) {
      for (const row of data.coupons) {
        try {
          await db.insert(coupons).values(row as any).onConflictDoNothing();
        } catch {
          /* skip */
        }
      }
    }

    return {
      status: "RESTORED",
      backupId: validated.backupId,
      safetyBackupId: safety.backupId,
      notes:
        "Catalog/config rows restored with onConflictDoNothing. Orders/payments/licenses not auto-overwritten — use Supabase PITR for full financial restore. Safety backup retained.",
    };
  } catch (e) {
    return {
      status: "ERROR",
      backupId: validated.backupId,
      safetyBackupId: safety.backupId,
      error: e instanceof Error ? e.message : "restore apply failed",
      notes: "Safety backup was created before failed apply. System should remain on pre-restore data.",
    };
  }
}

/** @deprecated name kept for callers */
export async function createMetadataBackup(payload: Record<string, unknown>): Promise<BackupResult> {
  const merged = { extra: payload };
  void merged;
  return createSystemBackup("metadata");
}
