/**
 * NUMI Schema — PostgreSQL (Supabase compatible)
 * NUMI v5.0.0 — PostgreSQL (Supabase) schema.
 */
import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const publishStatusEnum = pgEnum("publish_status", ["draft", "published", "archived"]);
export const provisioningModeEnum = pgEnum("provisioning_mode", ["manual", "external", "native"]);
export const demoStatusEnum = pgEnum("demo_status", ["unknown", "healthy", "degraded", "offline"]);
export const imageKindEnum = pgEnum("image_kind", ["hero", "screenshot", "preview"]);
export const mediaKindEnum = pgEnum("media_kind", ["video", "motion", "embed"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "payment_verified", "paid", "fulfilled", "cancelled"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "verified", "failed", "refunded"]);
export const deliveryStatusEnum = pgEnum("delivery_status", ["queued", "provisioning", "ready", "blocked"]);
export const assetKindEnum = pgEnum("asset_kind", ["source", "documentation", "license"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "published", "hidden"]);
export const discountTypeEnum = pgEnum("discount_type", ["percent", "fixed"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "pending", "resolved", "closed"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["normal", "high", "urgent"]);
export const deployEnvEnum = pgEnum("deploy_env", ["staging", "production"]);
export const deployStatusEnum = pgEnum("deploy_status", ["queued", "running", "succeeded", "failed", "rolled_back"]);
export const jobStatusEnum = pgEnum("job_status", ["queued", "running", "succeeded", "failed", "dead_letter"]);
export const instanceEnvEnum = pgEnum("instance_env", ["development", "staging", "production"]);
export const instanceStatusEnum = pgEnum("instance_status", [
  "creating", "provisioning", "deploying", "health_checking",
  "ready", "degraded", "failed", "rolling_back", "suspended", "archived",
]);
export const healthStatusEnum = pgEnum("health_status", ["unknown", "healthy", "unhealthy"]);

// ─── Tables ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  avatarUrl: text("avatarUrl"),
  company: varchar("company", { length: 180 }),
  website: varchar("website", { length: 320 }),
  bio: text("bio"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ userIdx: uniqueIndex("profiles_user_unique").on(table.userId) }));

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  status: publishStatusEnum("status").default("published").notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex("categories_slug_unique").on(table.slug),
  statusIdx: index("categories_status_idx").on(table.status),
  orderIdx: index("categories_order_idx").on(table.sortOrder),
}));

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  tagline: varchar("tagline", { length: 240 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  categoryId: integer("categoryId").references(() => categories.id, { onDelete: "set null" }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("EUR").notNull(),
  status: publishStatusEnum("status").default("draft").notNull(),
  heroImage: text("heroImage").notNull(),
  demoUrl: text("demoUrl"),
  sourceRepoUrl: text("sourceRepoUrl"),
  sourceRepoBranch: varchar("sourceRepoBranch", { length: 120 }).default("main"),
  provisioningMode: provisioningModeEnum("provisioningMode").default("manual").notNull(),
  demoStatus: demoStatusEnum("demoStatus").default("unknown").notNull(),
  lastDemoCheckAt: timestamp("lastDemoCheckAt", { withTimezone: true }),
  demoHttpStatus: integer("demoHttpStatus"),
  demoLatencyMs: integer("demoLatencyMs"),
  requirements: text("requirements"),
  license: text("license"),
  included: text("included"),
  faq: text("faq"),
  seoTitle: varchar("seoTitle", { length: 180 }),
  seoDescription: text("seoDescription"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex("products_slug_unique").on(table.slug),
  statusIdx: index("products_status_idx").on(table.status),
}));

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: varchar("alt", { length: 240 }).notNull(),
  kind: imageKindEnum("kind").default("screenshot").notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
}, (table) => ({ productIdx: index("product_images_product_idx").on(table.productId) }));

export const productFeatures = pgTable("product_features", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 140 }).notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
}, (table) => ({ productIdx: index("product_features_product_idx").on(table.productId) }));

export const productTechStack = pgTable("product_tech_stack", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  category: varchar("category", { length: 80 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
}, (table) => ({ productIdx: index("product_tech_product_idx").on(table.productId) }));

export const productVersions = pgTable("product_versions", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 40 }).notNull(),
  changelog: text("changelog"),
  releaseDate: timestamp("releaseDate", { withTimezone: true }).defaultNow().notNull(),
  isCurrent: boolean("isCurrent").default(false).notNull(),
}, (table) => ({ productIdx: index("product_versions_product_idx").on(table.productId) }));

export const productMedia = pgTable("product_media", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  kind: mediaKindEnum("kind").notNull(),
  url: text("url").notNull(),
  posterUrl: text("posterUrl"),
  metadata: text("metadata"),
}, (table) => ({ productIdx: index("product_media_product_idx").on(table.productId) }));

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  status: orderStatusEnum("status").default("pending").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("EUR").notNull(),
  provider: varchar("provider", { length: 80 }),
  providerReference: varchar("providerReference", { length: 180 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("orders_user_idx").on(table.userId),
  statusIdx: index("orders_status_idx").on(table.status),
}));

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("productId").notNull().references(() => products.id),
  productName: varchar("productName", { length: 160 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  licenseType: varchar("licenseType", { length: 80 }).default("single-project").notNull(),
}, (table) => ({ orderIdx: index("order_items_order_idx").on(table.orderId) }));

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: paymentStatusEnum("status").default("pending").notNull(),
  provider: varchar("provider", { length: 80 }),
  providerPaymentId: varchar("providerPaymentId", { length: 180 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("EUR").notNull(),
  verifiedAt: timestamp("verifiedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ orderIdx: uniqueIndex("payments_order_unique").on(table.orderId) }));

export const customerPurchases = pgTable("customer_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: integer("productId").notNull().references(() => products.id),
  orderItemId: integer("orderItemId").notNull().references(() => orderItems.id),
  licenseKey: varchar("licenseKey", { length: 120 }).notNull().unique(),
  accessGranted: boolean("accessGranted").default(false).notNull(),
  purchasedAt: timestamp("purchasedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("purchases_user_idx").on(table.userId),
  productIdx: index("purchases_product_idx").on(table.productId),
}));

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchaseId").notNull().references(() => customerPurchases.id, { onDelete: "cascade" }),
  status: deliveryStatusEnum("status").default("queued").notNull(),
  instanceUrl: text("instanceUrl"),
  adminUrl: text("adminUrl"),
  sourceReady: boolean("sourceReady").default(false).notNull(),
  documentationReady: boolean("documentationReady").default(false).notNull(),
  licenseReady: boolean("licenseReady").default(false).notNull(),
  sourceRepoUrl: text("sourceRepoUrl"),
  deploymentId: varchar("deploymentId", { length: 180 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ purchaseIdx: uniqueIndex("deliveries_purchase_unique").on(table.purchaseId) }));

export const downloadAssets = pgTable("download_assets", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchaseId").notNull().references(() => customerPurchases.id, { onDelete: "cascade" }),
  kind: assetKindEnum("kind").notNull(),
  fileKey: text("fileKey").notNull(),
  checksum: varchar("checksum", { length: 128 }),
  expiresAt: timestamp("expiresAt", { withTimezone: true }),
}, (table) => ({ purchaseIdx: index("download_assets_purchase_idx").on(table.purchaseId) }));

export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchaseId").notNull().references(() => customerPurchases.id, { onDelete: "cascade" }),
  licenseKey: varchar("licenseKey", { length: 120 }).notNull().unique(),
  type: varchar("type", { length: 80 }).default("single-project").notNull(),
  issuedAt: timestamp("issuedAt", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revokedAt", { withTimezone: true }),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: integer("userId").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 180 }),
  body: text("body"),
  status: reviewStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ productIdx: index("reviews_product_idx").on(table.productId) }));

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 60 }).notNull().unique(),
  discountType: discountTypeEnum("discountType").notNull(),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").default(true).notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }),
  maxUses: integer("maxUses"),
  usedCount: integer("usedCount").default(0).notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 80 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("readAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ userIdx: index("notifications_user_idx").on(table.userId) }));

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  subject: varchar("subject", { length: 180 }).notNull(),
  status: ticketStatusEnum("status").default("open").notNull(),
  priority: ticketPriorityEnum("priority").default("normal").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ userIdx: index("support_tickets_user_idx").on(table.userId) }));

export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchaseId").references(() => customerPurchases.id, { onDelete: "set null" }),
  productId: integer("productId").references(() => products.id, { onDelete: "set null" }),
  provider: varchar("provider", { length: 80 }).notNull(),
  externalId: varchar("externalId", { length: 180 }),
  repositoryUrl: text("repositoryUrl"),
  environment: deployEnvEnum("environment").default("production").notNull(),
  status: deployStatusEnum("status").default("queued").notNull(),
  commitSha: varchar("commitSha", { length: 80 }),
  url: text("url"),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt", { withTimezone: true }),
  finishedAt: timestamp("finishedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  purchaseIdx: index("deployments_purchase_idx").on(table.purchaseId),
  statusIdx: index("deployments_status_idx").on(table.status),
}));

export const automationJobs = pgTable("automation_jobs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 100 }).notNull(),
  status: jobStatusEnum("status").default("queued").notNull(),
  correlationId: varchar("correlationId", { length: 100 }).notNull(),
  payload: text("payload").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("maxAttempts").default(5).notNull(),
  lastError: text("lastError"),
  runAfter: timestamp("runAfter", { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp("lockedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("automation_jobs_status_idx").on(table.status),
  correlationIdx: index("automation_jobs_correlation_idx").on(table.correlationId),
}));

export const customerInstances = pgTable("customer_instances", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchaseId").notNull().references(() => customerPurchases.id, { onDelete: "cascade" }),
  productId: integer("productId").notNull().references(() => products.id),
  productVersionId: integer("productVersionId").references(() => productVersions.id),
  customerId: integer("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  githubRepository: varchar("githubRepository", { length: 320 }),
  githubCommit: varchar("githubCommit", { length: 80 }),
  sourceChecksum: varchar("sourceChecksum", { length: 120 }),
  vercelProjectId: varchar("vercelProjectId", { length: 120 }),
  vercelDeploymentId: varchar("vercelDeploymentId", { length: 120 }),
  databaseProvider: varchar("databaseProvider", { length: 40 }),
  databaseId: varchar("databaseId", { length: 120 }),
  domain: varchar("domain", { length: 320 }),
  instanceUrl: text("instanceUrl"),
  adminUrl: text("adminUrl"),
  environment: instanceEnvEnum("environment").default("production").notNull(),
  status: instanceStatusEnum("status").default("creating").notNull(),
  healthStatus: healthStatusEnum("healthStatus").default("unknown").notNull(),
  lastError: text("lastError"),
  sagaStep: varchar("sagaStep", { length: 80 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  purchaseIdx: uniqueIndex("customer_instances_purchase_unique").on(table.purchaseId),
  customerIdx: index("customer_instances_customer_idx").on(table.customerId),
  statusIdx: index("customer_instances_status_idx").on(table.status),
}));

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actorUserId").references(() => users.id),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  actorIdx: index("audit_actor_idx").on(table.actorUserId),
  actionIdx: index("audit_action_idx").on(table.action),
}));

export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Types ───────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type CustomerPurchase = typeof customerPurchases.$inferSelect;
