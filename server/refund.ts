/**
 * Refund handling after provider-confirmed refund webhook.
 * Idempotent: second refund on same payment is a no-op.
 */
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import {
  auditLogs,
  customerPurchases,
  deliveries,
  licenses,
  notifications,
  orderItems,
  orders,
  payments,
} from "../drizzle/schema";

export type RefundResult = {
  orderId: number;
  status: "refunded" | "idempotent" | "not_found";
  accessRevoked: boolean;
};

export async function applyVerifiedRefund(opts: {
  orderId: number;
  provider: string;
  providerPaymentId?: string;
  eventId?: string;
  revokeAccess?: boolean;
}): Promise<RefundResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const revoke = opts.revokeAccess !== false;

  return db.transaction(async (tx) => {
    const row = (
      await tx
        .select({ order: orders, payment: payments })
        .from(orders)
        .innerJoin(payments, eq(payments.orderId, orders.id))
        .where(eq(orders.id, opts.orderId))
        .limit(1)
    )[0];

    if (!row) return { orderId: opts.orderId, status: "not_found" as const, accessRevoked: false };
    if (row.payment.status === "refunded") {
      return { orderId: opts.orderId, status: "idempotent" as const, accessRevoked: false };
    }

    await tx.update(payments).set({ status: "refunded" }).where(eq(payments.orderId, opts.orderId));
    await tx.update(orders).set({ status: "cancelled" }).where(eq(orders.id, opts.orderId));

    let accessRevoked = false;
    if (revoke) {
      const orderPurchases = await tx
        .select({ purchase: customerPurchases })
        .from(customerPurchases)
        .innerJoin(orderItems, eq(orderItems.id, customerPurchases.orderItemId))
        .where(eq(orderItems.orderId, opts.orderId));

      for (const { purchase } of orderPurchases) {
        await tx.update(customerPurchases).set({ accessGranted: false }).where(eq(customerPurchases.id, purchase.id));
        await tx.update(deliveries).set({ status: "blocked" }).where(eq(deliveries.purchaseId, purchase.id));
        await tx
          .update(licenses)
          .set({ revokedAt: new Date() })
          .where(eq(licenses.purchaseId, purchase.id));
        await tx.insert(notifications).values({
          userId: purchase.userId,
          type: "payment.refunded",
          title: "Refund processed",
          body: "Your payment was refunded. Delivery access has been revoked.",
        });
        accessRevoked = true;
      }
    }

    await tx.insert(auditLogs).values({
      actorUserId: null,
      action: `${opts.provider}.refund_applied`,
      entityType: "order",
      entityId: String(opts.orderId),
      metadata: JSON.stringify({
        providerPaymentId: opts.providerPaymentId,
        eventId: opts.eventId,
        accessRevoked,
      }),
    });

    return { orderId: opts.orderId, status: "refunded" as const, accessRevoked };
  });
}
