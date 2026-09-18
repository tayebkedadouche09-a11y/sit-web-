import crypto from "node:crypto";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  Product,
  auditLogs,
  categories,
  coupons,
  customerPurchases,
  customerInstances,
  deliveries,
  downloadAssets,
  orderItems,
  orders,
  payments,
  licenses,
  notifications,
  deployments,
  automationJobs,
  productFeatures,
  productImages,
  productMedia,
  productTechStack,
  products,
  reviews,
  users,
} from "../drizzle/schema";
import { catalogSeed, categorySeed } from "../shared/catalog";
import { ENV } from "./_core/env";
import { storageGetSignedUrl } from "./storage";
import { requestProvisioning } from "./provisioning";
import { snapshotInstanceForRollback } from "./rollback";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;
let seedPromise: Promise<void> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Use connection pooling friendly settings for Supabase / Vercel serverless
      _client = postgres(process.env.DATABASE_URL, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false, // required for Supabase transaction pooler (port 6543)
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet as any,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function seedCategories() {
  const db = await getDb();
  if (!db) return;
  for (const category of categorySeed) {
    await db.insert(categories).values({ ...category, status: "published" }).onConflictDoUpdate({
      target: categories.slug,
      set: { name: category.name, description: category.description, sortOrder: category.sortOrder, status: "published" },
    });
    const row = (await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, category.slug)).limit(1))[0];
    if (row) await db.update(products).set({ categoryId: row.id }).where(eq(products.category, category.name));
  }
}

async function seedCatalog() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ count: sql<number>`count(*)` }).from(products);
  if (Number(existing[0]?.count ?? 0) > 0) return;

  for (const item of catalogSeed) {
    const inserted = await db.insert(products).values({
      slug: item.slug,
      name: item.name,
      tagline: item.tagline,
      description: item.description,
      category: item.category,
      price: item.price,
      currency: item.currency,
      status: item.status,
      heroImage: item.heroImage,
      demoUrl: item.demoUrl,
      sourceRepoUrl: (item as any).sourceRepoUrl || null,
      sourceRepoBranch: (item as any).sourceRepoBranch || "main",
      requirements: item.requirements,
      license: item.license,
      included: item.included,
      faq: item.faq,
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      provisioningMode: "native",
    }).returning({ id: products.id });
    const productId = inserted[0]?.id;
    if (!productId) continue;
    await db.insert(productFeatures).values(item.features.map(([title, description], index) => ({ productId, title, description, sortOrder: index })));
    await db.insert(productTechStack).values(item.tech.map((name, index) => ({ productId, name, sortOrder: index })));
    await db.insert(productImages).values([
      { productId, url: item.heroImage, alt: `${item.name} primary website preview`, kind: "hero", sortOrder: 0 },
    ]);
  }
}

async function backfillCatalogPresentation() {
  const db = await getDb();
  if (!db) return;
  for (const item of catalogSeed) {
    const product = (await db.select({ id: products.id, heroImage: products.heroImage, faq: products.faq }).from(products).where(eq(products.slug, item.slug)).limit(1))[0];
    if (!product) continue;
    if (!product.faq && item.faq) await db.update(products).set({ faq: item.faq }).where(eq(products.id, product.id));
    const existingImage = (await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, product.id)).limit(1))[0];
    if (!existingImage) {
      await db.insert(productImages).values({ productId: product.id, url: product.heroImage || item.heroImage, alt: `${item.name} primary website preview`, kind: "hero", sortOrder: 0 });
    }
  }
}

export async function ensureCatalogSeeded() {
  if (!seedPromise) seedPromise = (async () => { await seedCategories(); await seedCatalog(); await seedCategories(); await backfillCatalogPresentation(); })();
  await seedPromise;
}

export async function listPublishedProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  await ensureCatalogSeeded();
  return db.select().from(products).where(eq(products.status, "published")).orderBy(desc(products.createdAt));
}

export async function listPublishedCategories() {
  const db = await getDb();
  if (!db) return [];
  await ensureCatalogSeeded();
  return db.select().from(categories).where(eq(categories.status, "published")).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listMarketplaceProducts(input: { search?: string; category?: string }) {
  const db = await getDb();
  if (!db) return [];
  await ensureCatalogSeeded();
  const search = input.search?.trim().slice(0, 80);
  const conditions = [eq(products.status, "published")];
  if (input.category && input.category !== "all") conditions.push(eq(categories.slug, input.category));
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(like(products.name, pattern), like(products.description, pattern), like(products.tagline, pattern), like(products.category, pattern), like(categories.name, pattern), like(productTechStack.name, pattern))!);
  }
  const rows = await db.select({ product: products, categoryName: categories.name, categorySlug: categories.slug, techName: productTechStack.name })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productTechStack, eq(products.id, productTechStack.productId))
    .where(and(...conditions))
    .orderBy(desc(products.createdAt), asc(productTechStack.sortOrder));
  const grouped = new Map<number, { product: Product; category: { name: string; slug: string } | null; techStack: Array<{ name: string }> }>();
  for (const row of rows) {
    const current = grouped.get(row.product.id) ?? { product: row.product, category: row.categoryName && row.categorySlug ? { name: row.categoryName, slug: row.categorySlug } : null, techStack: [] };
    if (row.techName && !current.techStack.some((stack) => stack.name === row.techName)) current.techStack.push({ name: row.techName });
    grouped.set(row.product.id, current);
  }
  return Array.from(grouped.values());
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureCatalogSeeded();
  const product = (await db.select().from(products).where(and(eq(products.slug, slug), eq(products.status, "published"))).limit(1))[0];
  if (!product) return undefined;
  const [features, techStack, images, media, publishedReviews] = await Promise.all([
    db.select().from(productFeatures).where(eq(productFeatures.productId, product.id)).orderBy(productFeatures.sortOrder),
    db.select().from(productTechStack).where(eq(productTechStack.productId, product.id)).orderBy(productTechStack.sortOrder),
    db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(productImages.sortOrder),
    db.select().from(productMedia).where(eq(productMedia.productId, product.id)),
    db.select({ review: reviews, user: users }).from(reviews).innerJoin(users, eq(reviews.userId, users.id)).where(and(eq(reviews.productId, product.id), eq(reviews.status, "published"))).orderBy(desc(reviews.createdAt)),
  ]);
  return { ...product, features, techStack, images, media, reviews: publishedReviews };
}

export async function createPendingOrder(userId: number, product: Product) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    const orderResult = await tx.insert(orders).values({ userId, subtotal: product.price, currency: product.currency, status: "pending" }).returning({ id: orders.id });
    const orderId = orderResult[0]?.id;
    if (!orderId) throw new Error("Failed to create order");
    const itemResult = await tx.insert(orderItems).values({ orderId, productId: product.id, productName: product.name, unitPrice: product.price }).returning({ id: orderItems.id });
    const orderItemId = itemResult[0]?.id;
    if (!orderItemId) throw new Error("Failed to create order item");
    await tx.insert(payments).values({ orderId, amount: product.price, currency: product.currency, status: "pending" });
    return { orderId, orderItemId, status: "pending" as const };
  });
}

export async function getCheckoutOrder(userId: number, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select({ order: orders, item: orderItems, user: users }).from(orders).innerJoin(orderItems, eq(orders.id, orderItems.orderId)).innerJoin(users, eq(orders.userId, users.id)).where(and(eq(orders.id, orderId), eq(orders.userId, userId), eq(orders.status, "pending"))).limit(1))[0];
}

export async function getPaymentOrderForUser(userId: number, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select({ order: orders, payment: payments }).from(orders).innerJoin(payments, eq(orders.id, payments.orderId)).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).limit(1))[0];
}

export async function recordCheckoutSession(userId: number, orderId: number, sessionId: string, provider = "stripe") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.update(orders).set({ provider, providerReference: sessionId }).where(and(eq(orders.id, orderId), eq(orders.userId, userId), eq(orders.status, "pending"))).returning({ id: orders.id });
  return { orderId, sessionId, recorded: Boolean(result[0]?.id) };
}

export async function markOrderPaid(orderId: number, providerPaymentId: string, eventId?: string, provider = "stripe", verifiedAmountMinor?: number, verifiedCurrency?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.transaction(async (tx) => {
    const row = (await tx.select({ order: orders, item: orderItems, payment: payments, user: users }).from(orders).innerJoin(orderItems, eq(orders.id, orderItems.orderId)).innerJoin(payments, eq(orders.id, payments.orderId)).innerJoin(users, eq(orders.userId, users.id)).where(eq(orders.id, orderId)).limit(1))[0];
    if (!row) throw new Error("Order not found");
    if (row.order.status === "paid" || row.order.status === "fulfilled") return { orderId, status: row.order.status, idempotent: true, purchaseId: undefined };
    if (verifiedAmountMinor !== undefined) {
      const expectedMinor = Math.round(Number(row.order.subtotal) * 100);
      const receivedMinor = provider === "chargily" ? Math.round(verifiedAmountMinor * 100) : Math.round(verifiedAmountMinor);
      if (receivedMinor !== expectedMinor) throw new Error("Verified payment amount does not match the order total.");
    }
    if (verifiedCurrency && verifiedCurrency.toLowerCase() !== row.order.currency.toLowerCase()) throw new Error("Verified payment currency does not match the order.");
    await tx.update(orders).set({ status: "paid", provider, providerReference: providerPaymentId }).where(eq(orders.id, orderId));
    await tx.update(payments).set({ status: "verified", provider, providerPaymentId, verifiedAt: new Date() }).where(eq(payments.orderId, orderId));
    const existing = (await tx.select({ id: customerPurchases.id }).from(customerPurchases).where(eq(customerPurchases.orderItemId, row.item.id)).limit(1))[0];
    let purchaseId = existing?.id;
    if (!existing) {
      const licenseKey = `NUMI-${crypto.randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`;
      const purchase = await tx.insert(customerPurchases).values({ userId: row.order.userId, productId: row.item.productId, orderItemId: row.item.id, licenseKey, accessGranted: false }).returning({ id: customerPurchases.id });
      purchaseId = purchase[0]?.id;
      await tx.insert(deliveries).values({ purchaseId, status: "queued" });
      await tx.insert(licenses).values({ purchaseId, licenseKey, type: row.item.licenseType });
    }
    await tx.insert(notifications).values({ userId: row.order.userId, type: "payment.successful", title: "Payment confirmed", body: `Your purchase of ${row.item.productName} is verified. Delivery preparation has started.` });
    await tx.insert(auditLogs).values({ actorUserId: null, action: `${provider}.payment_verified`, entityType: "order", entityId: String(orderId), metadata: JSON.stringify({ providerPaymentId, eventId }) });
    return { orderId, status: "paid" as const, idempotent: false, purchaseId };
  });
  if (!result.idempotent && result.purchaseId) {
    await enqueueProvisioningJob(result.purchaseId, orderId);
    // Start delivery immediately after confirmed payment (do not wait for cron).
    try {
      await processAutomationJobs(3);
    } catch (error) {
      console.warn("[Provisioning] Immediate worker pass failed; cron/worker will retry:", error);
    }
  }
  return result;
}

export async function enqueueProvisioningJob(purchaseId: number, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const correlationId = `purchase-${purchaseId}`;
  const existing = (await db.select({ id: automationJobs.id }).from(automationJobs).where(and(eq(automationJobs.type, "provision_purchase"), eq(automationJobs.correlationId, correlationId), inArray(automationJobs.status, ["queued", "running", "succeeded"]))).limit(1))[0];
  if (existing) return existing.id;
  const inserted = await db.insert(automationJobs).values({ type: "provision_purchase", correlationId, payload: JSON.stringify({ purchaseId, orderId }), maxAttempts: 5, status: "queued" }).returning({ id: automationJobs.id });
  return inserted[0]?.id ?? 0;
}

export async function processAutomationJobs(limit = 3) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const jobs = await db.select().from(automationJobs).where(and(eq(automationJobs.status, "queued"), sql`${automationJobs.runAfter} <= NOW()`)).orderBy(asc(automationJobs.runAfter)).limit(Math.max(1, Math.min(limit, 10)));
  const results: Array<{ id: number; status: string; error?: string }> = [];
  for (const job of jobs) {
    const claimed = await db.update(automationJobs).set({ status: "running", lockedAt: new Date(), attempts: sql`${automationJobs.attempts} + 1` }).where(and(eq(automationJobs.id, job.id), eq(automationJobs.status, "queued"))).returning({ id: automationJobs.id });
    if (!claimed[0]?.id) continue;
    try {
      const payload = JSON.parse(job.payload) as { purchaseId: number; orderId: number };
      await attemptAutomaticProvisioning(payload.purchaseId, payload.orderId, 0, "");
      await db.update(automationJobs).set({ status: "succeeded", lastError: null, lockedAt: null }).where(eq(automationJobs.id, job.id));
      results.push({ id: job.id, status: "succeeded" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown automation error";
      const attempts = job.attempts + 1;
      const terminal = attempts >= job.maxAttempts;
      const retrySeconds = Math.min(3600, 30 * 2 ** Math.max(0, attempts - 1));
      await db.update(automationJobs).set({ status: terminal ? "dead_letter" : "queued", lastError: message, lockedAt: null, runAfter: new Date(Date.now() + retrySeconds * 1000) }).where(eq(automationJobs.id, job.id));
      results.push({ id: job.id, status: terminal ? "dead_letter" : "queued", error: message });
    }
  }
  return results;
}

export async function attemptAutomaticProvisioning(purchaseId: number, orderId: number, _productId: number, _productName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = (await db.select({ purchase: customerPurchases, product: products, item: orderItems, delivery: deliveries }).from(customerPurchases).innerJoin(products, eq(customerPurchases.productId, products.id)).innerJoin(orderItems, eq(customerPurchases.orderItemId, orderItems.id)).leftJoin(deliveries, eq(customerPurchases.id, deliveries.purchaseId)).where(eq(customerPurchases.id, purchaseId)).limit(1))[0];
  if (!row) throw new Error("Purchase not found");
  if (row.delivery?.status === "ready" && row.delivery.instanceUrl && row.purchase.accessGranted) {
    return { purchaseId, status: "ready" as const, configured: true, idempotent: true };
  }

  // Ensure isolated customer_instance row (MASTER/VERSION/INSTANCE separation)
  let instance = (await db.select().from(customerInstances).where(eq(customerInstances.purchaseId, purchaseId)).limit(1))[0];
  if (!instance) {
    const inserted = await db.insert(customerInstances).values({
      purchaseId,
      productId: row.product.id,
      productVersionId: null,
      customerId: row.purchase.userId,
      status: "provisioning",
      healthStatus: "unknown",
      sagaStep: "INSTANCE_CREATED",
      environment: "production",
    }).returning({ id: customerInstances.id });
    const id = inserted[0]?.id;
    instance = (await db.select().from(customerInstances).where(eq(customerInstances.id, id)).limit(1))[0];
  } else if (instance.status === "ready" && instance.instanceUrl) {
    return { purchaseId, status: "ready" as const, configured: true, idempotent: true, instanceId: instance.id };
  } else {
    await snapshotInstanceForRollback(instance.id);
    await db.update(customerInstances).set({ status: "provisioning", sagaStep: "PROVISIONING", lastError: null }).where(eq(customerInstances.id, instance.id));
  }

  await db.update(customerInstances).set({ sagaStep: "SOURCE_PROVISIONING", status: "provisioning" }).where(eq(customerInstances.id, instance!.id));

  const autoNative = ENV.featureNativeProvisioning && Boolean(row.product.sourceRepoUrl);
  const resolvedMode = autoNative ? "native" : (row.product.provisioningMode || "manual");
  const response = await requestProvisioning({
    purchaseId,
    orderId,
    productId: row.product.id,
    productName: row.product.name,
    productSlug: row.product.slug,
    sourceRepoUrl: row.product.sourceRepoUrl,
    sourceRepoBranch: row.product.sourceRepoBranch,
    mode: resolvedMode,
  });

  if (!response) {
    await db.update(customerInstances).set({
      status: "failed",
      sagaStep: "NOT_CONFIGURED",
      lastError: "Provisioning NOT_CONFIGURED or manual mode — owner must complete delivery or configure GitHub+Vercel",
    }).where(eq(customerInstances.id, instance!.id));
    return { purchaseId, status: "queued" as const, configured: false, reason: "NOT_CONFIGURED_OR_MANUAL", instanceId: instance!.id };
  }

  // REAL readiness gate — never invent success.
  // healthOk must be strictly true; healthOk=false or undefined blocks READY.
  const ready = Boolean(
    response.instanceUrl &&
    response.sourceReady &&
    response.licenseReady &&
    response.healthOk === true
  );

  const repoName = response.sourceRepoUrl?.replace(/^https?:\/\/github\.com\//, "") ?? null;

  await db.update(customerInstances).set({
    githubRepository: repoName,
    vercelDeploymentId: response.deploymentId ?? null,
    instanceUrl: response.instanceUrl ?? null,
    adminUrl: response.adminUrl ?? null,
    databaseId: (response as any).databaseId ?? null,
    databaseProvider: (response as any).databaseProvider ?? null,
    status: ready ? "ready" : response.healthOk === false ? "degraded" : "deploying",
    healthStatus: ready ? "healthy" : response.healthOk === false ? "unhealthy" : "unknown",
    sagaStep: ready ? "DELIVERY_READY" : "DEPLOYING",
    lastError: ready ? null : (response.notes ?? "Provisioning in progress or health incomplete"),
    metadata: JSON.stringify({ mode: response.mode, notes: response.notes, healthStatus: response.healthStatus, healthLatencyMs: response.healthLatencyMs }),
  }).where(eq(customerInstances.id, instance!.id));

  if (response.deploymentId) {
    await db.insert(deployments).values({
      purchaseId,
      productId: row.product.id,
      provider: response.mode === "native" ? "vercel" : "external",
      externalId: response.deploymentId,
      repositoryUrl: response.sourceRepoUrl ?? row.product.sourceRepoUrl ?? null,
      environment: "production",
      status: ready ? "succeeded" : "running",
      url: response.instanceUrl ?? null,
      startedAt: new Date(),
      finishedAt: ready ? new Date() : null,
    });
  }

  await db.update(deliveries).set({
    status: ready ? "ready" : "provisioning",
    instanceUrl: response.instanceUrl ?? null,
    adminUrl: response.adminUrl ?? null,
    sourceRepoUrl: response.sourceRepoUrl ?? row.product.sourceRepoUrl ?? null,
    deploymentId: response.deploymentId ?? null,
    sourceReady: Boolean(response.sourceReady),
    documentationReady: Boolean(response.documentationReady),
    licenseReady: Boolean(response.licenseReady),
  }).where(eq(deliveries.purchaseId, purchaseId));

  if (ready) {
    await db.update(customerPurchases).set({ accessGranted: true }).where(eq(customerPurchases.id, purchaseId));
  }

  await db.insert(notifications).values({
    userId: row.purchase.userId,
    type: ready ? "delivery.ready" : "delivery.provisioning",
    title: ready ? "Delivery ready" : "Delivery provisioning",
    body: ready
      ? `Your ${row.product.name} system is ready for access.`
      : `Your ${row.product.name} system is being provisioned. We will notify you when it is ready.`,
  });

  return {
    purchaseId,
    instanceId: instance!.id,
    status: ready ? "ready" as const : "provisioning" as const,
    configured: true,
  };
}

export async function markOrderPaymentFailed(orderId: number, providerPaymentId: string, eventId?: string, provider = "stripe") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = (await db.select({ order: orders, item: orderItems }).from(orders).leftJoin(orderItems, eq(orders.id, orderItems.orderId)).where(eq(orders.id, orderId)).limit(1))[0];
  if (!row) return { orderId, status: "ignored" as const };
  await db.update(orders).set({ status: "cancelled", provider, providerReference: providerPaymentId }).where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
  await db.update(payments).set({ status: "failed", provider, providerPaymentId }).where(eq(payments.orderId, orderId));
  await db.insert(notifications).values({ userId: row.order.userId, type: "payment.failed", title: "Payment failed", body: `Payment for ${row.item?.productName ?? "your order"} was not completed. No delivery access was granted.` });
  await db.insert(auditLogs).values({ actorUserId: null, action: `${provider}.payment_failed`, entityType: "order", entityId: String(orderId), metadata: JSON.stringify({ providerPaymentId, eventId }) });
  return { orderId, status: "failed" as const };
}

export async function getCustomerPurchases(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ purchase: customerPurchases, product: products, delivery: deliveries, order: orders, payment: payments })
    .from(customerPurchases)
    .innerJoin(products, eq(customerPurchases.productId, products.id))
    .leftJoin(deliveries, eq(customerPurchases.id, deliveries.purchaseId))
    .leftJoin(orderItems, eq(customerPurchases.orderItemId, orderItems.id))
    .leftJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(payments, eq(orders.id, payments.orderId))
    .where(eq(customerPurchases.userId, userId))
    .orderBy(desc(customerPurchases.purchasedAt));
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(12);
}

export async function getProtectedDownload(userId: number, purchaseId: number, kind: "source" | "documentation" | "license") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = (await db.select({ asset: downloadAssets, purchase: customerPurchases, delivery: deliveries, license: licenses })
    .from(downloadAssets)
    .innerJoin(customerPurchases, eq(downloadAssets.purchaseId, customerPurchases.id))
    .leftJoin(deliveries, eq(customerPurchases.id, deliveries.purchaseId))
    .leftJoin(licenses, eq(licenses.purchaseId, customerPurchases.id))
    .where(and(eq(downloadAssets.purchaseId, purchaseId), eq(downloadAssets.kind, kind), eq(customerPurchases.userId, userId), eq(customerPurchases.accessGranted, true)))
    .limit(1))[0];
  // Delivery gate: ready + ownership + access + not revoked
  if (!row || row.delivery?.status !== "ready") return undefined;
  if (row.license?.revokedAt) return undefined;
  if (row.asset.expiresAt && row.asset.expiresAt.getTime() < Date.now()) return undefined;
  const url = await storageGetSignedUrl(row.asset.fileKey);
  await recordAudit(userId, "download.issue", "download_asset", row.asset.id, { kind });
  return { url, kind, expiresAt: row.asset.expiresAt };
}

export async function checkPublishedDemos() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ id: products.id, demoUrl: products.demoUrl }).from(products).where(eq(products.status, "published"));
  const results: Array<{ productId: number; status: string; httpStatus?: number; latencyMs: number }> = [];
  for (const row of rows) {
    if (!row.demoUrl) {
      await db.update(products).set({ demoStatus: "unknown", lastDemoCheckAt: new Date(), demoHttpStatus: null, demoLatencyMs: null }).where(eq(products.id, row.id));
      continue;
    }
    const started = Date.now();
    try {
      const response = await fetch(row.demoUrl, { redirect: "follow", signal: AbortSignal.timeout(10000) });
      const latencyMs = Date.now() - started;
      const status = response.ok ? "healthy" : response.status >= 500 ? "offline" : "degraded";
      await db.update(products).set({ demoStatus: status, lastDemoCheckAt: new Date(), demoHttpStatus: response.status, demoLatencyMs: latencyMs }).where(eq(products.id, row.id));
      results.push({ productId: row.id, status, httpStatus: response.status, latencyMs });
    } catch {
      const latencyMs = Date.now() - started;
      await db.update(products).set({ demoStatus: "offline", lastDemoCheckAt: new Date(), demoHttpStatus: null, demoLatencyMs: latencyMs }).where(eq(products.id, row.id));
      results.push({ productId: row.id, status: "offline", latencyMs });
    }
  }
  return results;
}

export async function getAdminOverview() {
  const db = await getDb();
  if (!db) return { products: 0, orders: 0, customers: 0, revenue: "0.00" };
  await ensureCatalogSeeded();
  const [productCount, orderCount, paidOrderCount, customerCount, revenue, productViews, demoOpens] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.status, "published")),
    db.select({ count: sql<number>`count(*)` }).from(orders),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "paid")),
    db.select({ count: sql<number>`count(distinct ${orders.userId})` }).from(orders),
    db.select({ total: sql<string>`coalesce(sum(${orders.subtotal}), 0)` }).from(orders).where(eq(orders.status, "paid")),
    db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(eq(auditLogs.action, "product.view")),
    db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(eq(auditLogs.action, "demo.open")),
  ]);
  return {
    products: Number(productCount[0]?.count ?? 0),
    orders: Number(orderCount[0]?.count ?? 0),
    paidOrders: Number(paidOrderCount[0]?.count ?? 0),
    customers: Number(customerCount[0]?.count ?? 0),
    revenue: String(revenue[0]?.total ?? "0.00"),
    productViews: Number(productViews[0]?.count ?? 0),
    demoOpens: Number(demoOpens[0]?.count ?? 0),
  };
}


export async function recordAudit(actorUserId: number, action: string, entityType: string, entityId?: number, metadata?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ actorUserId, action, entityType, entityId: entityId ? String(entityId) : null, metadata: metadata ? JSON.stringify(metadata) : null });
}

export async function recordAnalyticsEvent(action: "product.view" | "demo.open", entityId?: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ actorUserId: null, action, entityType: "analytics", entityId: entityId ? String(entityId) : null, metadata: null });
}

export type AdminProductInput = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  categoryId: number;
  price: string;
  currency: string;
  heroImage: string;
  demoUrl?: string | null;
  sourceRepoUrl?: string | null;
  sourceRepoBranch?: string | null;
  provisioningMode?: "manual" | "external" | "native";
  requirements?: string | null;
  license?: string | null;
  included?: string | null;
  faq?: string | null;
  status: "draft" | "published" | "archived";
  features: Array<{ title: string; description: string }>;
  techStack: Array<{ name: string; category?: string | null }>;
  images?: Array<{ url: string; alt: string; kind: "hero" | "screenshot" | "preview" }>;
};

export async function checkAdminProductDemo(actorUserId: number, productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = (await db.select({ id: products.id, demoUrl: products.demoUrl }).from(products).where(eq(products.id, productId)).limit(1))[0];
  if (!row) throw new Error("Product not found");
  if (!row.demoUrl) {
    await db.update(products).set({ demoStatus: "unknown", lastDemoCheckAt: new Date(), demoHttpStatus: null, demoLatencyMs: null }).where(eq(products.id, productId));
    await recordAudit(actorUserId, "product.demo_check", "product", productId, { status: "unknown", reason: "missing_demo_url" });
    return { productId, status: "unknown" as const, message: "No live demo URL is configured." };
  }
  const started = Date.now();
  try {
    const response = await fetch(row.demoUrl, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(10000) });
    const latencyMs = Date.now() - started;
    const status = response.ok ? "healthy" : response.status >= 500 ? "offline" : "degraded";
    await db.update(products).set({ demoStatus: status, lastDemoCheckAt: new Date(), demoHttpStatus: response.status, demoLatencyMs: latencyMs }).where(eq(products.id, productId));
    await recordAudit(actorUserId, "product.demo_check", "product", productId, { status, httpStatus: response.status, latencyMs });
    return { productId, status, httpStatus: response.status, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - started;
    await db.update(products).set({ demoStatus: "offline", lastDemoCheckAt: new Date(), demoHttpStatus: null, demoLatencyMs: latencyMs }).where(eq(products.id, productId));
    await recordAudit(actorUserId, "product.demo_check", "product", productId, { status: "offline", latencyMs, error: error instanceof Error ? error.message : "unknown" });
    return { productId, status: "offline" as const, latencyMs };
  }
}

export async function listAdminProducts() {
  const db = await getDb();
  if (!db) return [];
  await ensureCatalogSeeded();
  const rows = await db.select({ product: products, categoryRecord: categories }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).orderBy(desc(products.updatedAt));
  return Promise.all(rows.map(async ({ product, categoryRecord }) => {
    const [features, techStack] = await Promise.all([
      db.select().from(productFeatures).where(eq(productFeatures.productId, product.id)).orderBy(productFeatures.sortOrder),
      db.select().from(productTechStack).where(eq(productTechStack.productId, product.id)).orderBy(productTechStack.sortOrder),
    ]);
    return { ...product, categoryRecord, features, techStack };
  }));
}

export async function listAdminCategories() {
  const db = await getDb();
  if (!db) return [];
  await ensureCatalogSeeded();
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export type AdminCategoryInput = { name: string; slug: string; description?: string | null; status: "draft" | "published" | "archived"; sortOrder: number };

export async function createAdminCategory(actorUserId: number, input: AdminCategoryInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(categories).values({ ...input, description: input.description || null }).returning({ id: categories.id });
  const id = result[0]?.id;
  await recordAudit(actorUserId, "category.create", "category", id, { slug: input.slug });
  return id;
}

export async function updateAdminCategory(actorUserId: number, categoryId: number, input: AdminCategoryInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(categories).set({ ...input, description: input.description || null }).where(eq(categories.id, categoryId));
  await recordAudit(actorUserId, "category.update", "category", categoryId, { slug: input.slug, status: input.status });
  return { categoryId, ...input };
}

export async function updateAdminCategoryStatus(actorUserId: number, categoryId: number, status: "draft" | "published" | "archived") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(categories).set({ status }).where(eq(categories.id, categoryId));
  await recordAudit(actorUserId, `category.${status}`, "category", categoryId, { status });
  return { categoryId, status };
}

export async function deleteAdminCategory(actorUserId: number, categoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const references = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.categoryId, categoryId));
  if (Number(references[0]?.count ?? 0) > 0) throw new Error("Categories assigned to products must be archived or reassigned before deletion.");
  await db.delete(categories).where(eq(categories.id, categoryId));
  await recordAudit(actorUserId, "category.delete", "category", categoryId);
  return { categoryId };
}

export async function reorderAdminCategories(actorUserId: number, items: Array<{ categoryId: number; sortOrder: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async (tx) => { for (const item of items) await tx.update(categories).set({ sortOrder: item.sortOrder }).where(eq(categories.id, item.categoryId)); });
  await recordAudit(actorUserId, "category.reorder", "category", undefined, { count: items.length });
  return listAdminCategories();
}

export async function createAdminProduct(actorUserId: number, input: AdminProductInput) {
  if (input.status === "published") throw new Error("Create the product as draft, verify its live demo, then publish it.");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.transaction(async (tx) => {
    const inserted = await tx.insert(products).values({
      slug: input.slug,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      category: input.category,
      categoryId: input.categoryId,
      price: input.price,
      currency: input.currency,
      status: input.status,
      heroImage: input.heroImage,
      demoUrl: input.demoUrl || null,
      sourceRepoUrl: input.sourceRepoUrl || null,
      sourceRepoBranch: input.sourceRepoBranch || "main",
      provisioningMode: input.provisioningMode || "native",
      requirements: input.requirements || null,
      license: input.license || null,
      included: input.included || null,
      faq: input.faq || null,
    }).returning({ id: products.id });
    const productId = inserted[0]?.id;
    if (input.features.length) await tx.insert(productFeatures).values(input.features.map((feature, index) => ({ productId, title: feature.title, description: feature.description, sortOrder: index })));
    if (input.techStack.length) await tx.insert(productTechStack).values(input.techStack.map((stack, index) => ({ productId, name: stack.name, category: stack.category || null, sortOrder: index })));
    return productId;
  });
  await recordAudit(actorUserId, "product.create", "product", result, { slug: input.slug, status: input.status });
  return getProductByIdForAdmin(result);
}

export async function updateAdminProduct(actorUserId: number, productId: number, input: AdminProductInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = (await db.select({ demoUrl: products.demoUrl, demoStatus: products.demoStatus }).from(products).where(eq(products.id, productId)).limit(1))[0];
  if (!current) throw new Error("Product not found");
  if (input.status === "published" && (!input.demoUrl || !input.sourceRepoUrl || current.demoStatus !== "healthy" || current.demoUrl !== input.demoUrl)) throw new Error("A product can only be published after its exact live demo URL has passed a health check.");
  await db.transaction(async (tx) => {
    await tx.update(products).set({ slug: input.slug, name: input.name, tagline: input.tagline, description: input.description, category: input.category, categoryId: input.categoryId, price: input.price, currency: input.currency, status: input.status, heroImage: input.heroImage, demoUrl: input.demoUrl || null, sourceRepoUrl: input.sourceRepoUrl || null, sourceRepoBranch: input.sourceRepoBranch || "main", provisioningMode: input.provisioningMode || "native", requirements: input.requirements || null, license: input.license || null, included: input.included || null, faq: input.faq || null }).where(eq(products.id, productId));
    if (current.demoUrl !== (input.demoUrl || null)) await tx.update(products).set({ demoStatus: "unknown", lastDemoCheckAt: null, demoHttpStatus: null, demoLatencyMs: null }).where(eq(products.id, productId));
    await tx.delete(productFeatures).where(eq(productFeatures.productId, productId));
    await tx.delete(productTechStack).where(eq(productTechStack.productId, productId));
    if (input.features.length) await tx.insert(productFeatures).values(input.features.map((feature, index) => ({ productId, title: feature.title, description: feature.description, sortOrder: index })));
    if (input.techStack.length) await tx.insert(productTechStack).values(input.techStack.map((stack, index) => ({ productId, name: stack.name, category: stack.category || null, sortOrder: index })));
  });
  await recordAudit(actorUserId, "product.update", "product", productId, { slug: input.slug, status: input.status });
  return getProductByIdForAdmin(productId);
}

async function getProductByIdForAdmin(productId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const product = (await db.select().from(products).where(eq(products.id, productId)).limit(1))[0];
  if (!product) return undefined;
  const [features, techStack] = await Promise.all([
    db.select().from(productFeatures).where(eq(productFeatures.productId, productId)).orderBy(productFeatures.sortOrder),
    db.select().from(productTechStack).where(eq(productTechStack.productId, productId)).orderBy(productTechStack.sortOrder),
  ]);
  return { ...product, features, techStack };
}

export async function updateAdminProductStatus(actorUserId: number, productId: number, status: "draft" | "published" | "archived") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (status === "published") {
    const product = (await db.select({ demoUrl: products.demoUrl, sourceRepoUrl: products.sourceRepoUrl }).from(products).where(eq(products.id, productId)).limit(1))[0];
    if (!product?.demoUrl || !product.sourceRepoUrl) throw new Error("Cannot publish: configure a real demo URL and GitHub source repository first.");
    const health = (await db.select({ demoStatus: products.demoStatus }).from(products).where(eq(products.id, productId)).limit(1))[0];
    if (health?.demoStatus !== "healthy") throw new Error("Cannot publish: run the live demo health check and make sure it is healthy first.");
  }
  await db.update(products).set({ status }).where(eq(products.id, productId));
  await recordAudit(actorUserId, `product.${status}`, "product", productId, { status });
  return { productId, status };
}

export async function deleteAdminProduct(actorUserId: number, productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const references = await db.select({ count: sql<number>`count(*)` }).from(orderItems).where(eq(orderItems.productId, productId));
  if (Number(references[0]?.count ?? 0) > 0) throw new Error("Products with order history must be archived instead of deleted.");
  await db.delete(productImages).where(eq(productImages.productId, productId));
  await db.delete(productFeatures).where(eq(productFeatures.productId, productId));
  await db.delete(productTechStack).where(eq(productTechStack.productId, productId));
  await db.delete(products).where(eq(products.id, productId));
  await recordAudit(actorUserId, "product.delete", "product", productId);
  return { productId, deleted: true };
}

export async function listAdminOrders() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ order: orders, user: users, item: orderItems, payment: payments })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .leftJoin(payments, eq(orders.id, payments.orderId))
    .orderBy(desc(orders.createdAt));
  return rows;
}

export async function listAdminDeliveries() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ delivery: deliveries, purchase: customerPurchases, product: products, user: users })
    .from(deliveries)
    .innerJoin(customerPurchases, eq(deliveries.purchaseId, customerPurchases.id))
    .innerJoin(products, eq(customerPurchases.productId, products.id))
    .innerJoin(users, eq(customerPurchases.userId, users.id))
    .orderBy(desc(deliveries.updatedAt));
}

export async function updateAdminDelivery(actorUserId: number, deliveryId: number, input: { status: "queued" | "provisioning" | "ready" | "blocked"; instanceUrl?: string | null; adminUrl?: string | null; sourceReady: boolean; documentationReady: boolean; licenseReady: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(deliveries).set({ status: input.status, instanceUrl: input.instanceUrl || null, adminUrl: input.adminUrl || null, sourceReady: input.sourceReady, documentationReady: input.documentationReady, licenseReady: input.licenseReady }).where(eq(deliveries.id, deliveryId));
  await recordAudit(actorUserId, "delivery.update", "delivery", deliveryId, { status: input.status });
  return { deliveryId, ...input };
}


export async function updateAdminOrderStatus(actorUserId: number, orderId: number, status: "fulfilled" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = (await db.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!current) throw new Error("Order not found");
  if (status === "fulfilled" && current.status !== "paid") throw new Error("Only paid orders can be fulfilled");
  if (status === "cancelled" && ["fulfilled", "cancelled"].includes(current.status)) throw new Error("This order can no longer be cancelled");
  await db.update(orders).set({ status }).where(eq(orders.id, orderId));
  await recordAudit(actorUserId, `order.${status}`, "order", orderId, { previousStatus: current.status, status });
  return { orderId, status };
}


export async function createCustomerReview(userId: number, input: { productId: number; rating: number; title?: string | null; body?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const purchase = (await db.select({ id: customerPurchases.id }).from(customerPurchases).where(and(eq(customerPurchases.userId, userId), eq(customerPurchases.productId, input.productId), eq(customerPurchases.accessGranted, true))).limit(1))[0];
  if (!purchase) throw new Error("Only verified purchasers can review this product.");
  const existing = (await db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.userId, userId), eq(reviews.productId, input.productId))).limit(1))[0];
  if (existing) throw new Error("You already reviewed this product.");
  const inserted = await db.insert(reviews).values({ productId: input.productId, userId, rating: input.rating, title: input.title || null, body: input.body || null, status: "pending" }).returning({ id: reviews.id });
  return { reviewId: inserted[0]?.id ?? 0, status: "pending" as const };
}

export async function listAdminReviews() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ review: reviews, product: products, user: users }).from(reviews).innerJoin(products, eq(reviews.productId, products.id)).innerJoin(users, eq(reviews.userId, users.id)).orderBy(desc(reviews.createdAt));
}

export async function updateAdminReviewStatus(actorUserId: number, reviewId: number, status: "pending" | "published" | "hidden") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(reviews).set({ status }).where(eq(reviews.id, reviewId));
  await recordAudit(actorUserId, `review.${status}`, "review", reviewId, { status });
  return { reviewId, status };
}

export async function listAdminCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.id));
}

export async function createAdminCoupon(actorUserId: number, input: { code: string; discountType: "percent" | "fixed"; discountValue: string; expiresAt?: Date | null; maxUses?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const inserted = await db.insert(coupons).values({ code: input.code.trim().toUpperCase(), discountType: input.discountType, discountValue: input.discountValue, expiresAt: input.expiresAt || null, maxUses: input.maxUses ?? null, active: true }).returning({ id: coupons.id });
  const id = inserted[0]?.id;
  await recordAudit(actorUserId, "coupon.create", "coupon", id, { code: input.code });
  return { id };
}

export async function updateAdminCoupon(actorUserId: number, couponId: number, input: { active?: boolean; expiresAt?: Date | null; maxUses?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(coupons).set({ active: input.active, expiresAt: input.expiresAt, maxUses: input.maxUses }).where(eq(coupons.id, couponId));
  await recordAudit(actorUserId, "coupon.update", "coupon", couponId, input);
  return { couponId, ...input };
}

export async function validateCoupon(code: string, subtotal: string) {
  const db = await getDb();
  if (!db) return { valid: false, reason: "Database unavailable" };
  const coupon = (await db.select().from(coupons).where(and(eq(coupons.code, code.trim().toUpperCase()), eq(coupons.active, true))).limit(1))[0];
  if (!coupon) return { valid: false, reason: "Coupon not found" };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return { valid: false, reason: "Coupon expired" };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { valid: false, reason: "Coupon usage limit reached" };
  const base = Number(subtotal);
  const value = Number(coupon.discountValue);
  const discount = coupon.discountType === "percent" ? Math.min(base, base * value / 100) : Math.min(base, value);
  return { valid: true, code: coupon.code, discount: discount.toFixed(2), total: Math.max(0, base - discount).toFixed(2), currency: "EUR" };
}
