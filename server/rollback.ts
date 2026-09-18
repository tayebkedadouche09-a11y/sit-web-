/**
 * Deployment rollback for a customer instance.
 * Stores previous deployment coordinates in metadata and restores them.
 */
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { auditLogs, customerInstances, deliveries } from "../drizzle/schema";

export type RollbackResult = {
  status: "rolled_back" | "no_previous" | "not_found" | "error";
  instanceId?: number;
  previousDeploymentId?: string | null;
  currentDeploymentId?: string | null;
  error?: string;
};

function parseMeta(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Snapshot current deployment as "previous" before a new deploy */
export async function snapshotInstanceForRollback(instanceId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = (await db.select().from(customerInstances).where(eq(customerInstances.id, instanceId)).limit(1))[0];
  if (!row) return;
  const meta = parseMeta(row.metadata);
  meta.previous = {
    vercelDeploymentId: row.vercelDeploymentId,
    vercelProjectId: row.vercelProjectId,
    instanceUrl: row.instanceUrl,
    githubCommit: row.githubCommit,
    productVersionId: row.productVersionId,
    at: new Date().toISOString(),
  };
  await db
    .update(customerInstances)
    .set({ metadata: JSON.stringify(meta), updatedAt: new Date() })
    .where(eq(customerInstances.id, instanceId));
}

export async function rollbackCustomerInstance(opts: {
  instanceId: number;
  actorUserId?: number | null;
  reason?: string;
}): Promise<RollbackResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const row = (await db.select().from(customerInstances).where(eq(customerInstances.id, opts.instanceId)).limit(1))[0];
  if (!row) return { status: "not_found" };

  const meta = parseMeta(row.metadata);
  const prev = meta.previous as
    | {
        vercelDeploymentId?: string;
        vercelProjectId?: string;
        instanceUrl?: string;
        githubCommit?: string;
        productVersionId?: number;
      }
    | undefined;

  if (!prev?.instanceUrl && !prev?.vercelDeploymentId) {
    return { status: "no_previous", instanceId: row.id, currentDeploymentId: row.vercelDeploymentId };
  }

  const nextMeta = {
    ...meta,
    rolledBackFrom: {
      vercelDeploymentId: row.vercelDeploymentId,
      instanceUrl: row.instanceUrl,
      at: new Date().toISOString(),
      reason: opts.reason || "manual",
    },
  };

  await db
    .update(customerInstances)
    .set({
      vercelDeploymentId: prev.vercelDeploymentId || row.vercelDeploymentId,
      vercelProjectId: prev.vercelProjectId || row.vercelProjectId,
      instanceUrl: prev.instanceUrl || row.instanceUrl,
      githubCommit: prev.githubCommit || row.githubCommit,
      productVersionId: prev.productVersionId ?? row.productVersionId,
      status: "ready",
      healthStatus: "unknown",
      lastError: null,
      sagaStep: "ROLLED_BACK",
      metadata: JSON.stringify(nextMeta),
      updatedAt: new Date(),
    })
    .where(eq(customerInstances.id, row.id));

  await db
    .update(deliveries)
    .set({
      instanceUrl: prev.instanceUrl || row.instanceUrl,
      deploymentId: prev.vercelDeploymentId || row.vercelDeploymentId,
      status: "ready",
    })
    .where(eq(deliveries.purchaseId, row.purchaseId));

  await db.insert(auditLogs).values({
    actorUserId: opts.actorUserId ?? null,
    action: "instance.rollback",
    entityType: "customer_instance",
    entityId: String(row.id),
    metadata: JSON.stringify({
      reason: opts.reason,
      previousDeploymentId: prev.vercelDeploymentId,
      fromDeploymentId: row.vercelDeploymentId,
    }),
  });

  return {
    status: "rolled_back",
    instanceId: row.id,
    previousDeploymentId: prev.vercelDeploymentId,
    currentDeploymentId: row.vercelDeploymentId,
  };
}
