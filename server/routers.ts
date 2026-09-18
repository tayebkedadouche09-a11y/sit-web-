import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateProductFaq } from "./faqAi";
import { probeIntegrations, getPaymentProvidersAvailability, getProvisioningCapabilities } from "./integrations";
import { createSystemBackup, validateBackupEnvelope, restoreFromBackupEnvelope, getBackupStatus } from "./backup";
import { rollbackCustomerInstance } from "./rollback";
import { applyVerifiedRefund } from "./refund";
import { createStripeCheckoutSession } from "./stripe";
import { createChargilyCheckoutSession } from "./chargily";
import { createPayPalOrder, capturePayPalOrder } from "./paypal";
import {
  createPendingOrder,
  createAdminProduct,
  createAdminCategory,
  createAdminCoupon,
  createCustomerReview,
  deleteAdminProduct,
  deleteAdminCategory,
  ensureCatalogSeeded,
  getAdminOverview,
  getCustomerPurchases,
  getUserNotifications,
  getCheckoutOrder,
  getPaymentOrderForUser,
  getProtectedDownload,
  getProductBySlug,
  listAdminDeliveries,
  listAdminOrders,
  listAdminProducts,
  listAdminCategories,
  listAdminCoupons,
  listAdminReviews,
  listPublishedProducts,
  listPublishedCategories,
  listMarketplaceProducts,
  recordAnalyticsEvent,
  updateAdminCoupon,
  updateAdminDelivery,
  updateAdminOrderStatus,
  updateAdminProduct,
  updateAdminProductStatus,
  checkAdminProductDemo,
  markOrderPaid,
  updateAdminCategory,
  updateAdminCategoryStatus,
  reorderAdminCategories,
  updateAdminReviewStatus,
  recordCheckoutSession,
  validateCoupon,
} from "./db";

const productSlugSchema = z.object({ slug: z.string().min(1).max(160) });
const productAdminSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(160),
  tagline: z.string().min(2).max(240),
  description: z.string().min(10),
  category: z.string().min(2).max(80),
  categoryId: z.number().int().positive(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3).default("EUR"),
  heroImage: z.string().min(1),
  demoUrl: z.string().url().nullable().optional(),
  sourceRepoUrl: z.string().url().nullable().optional(),
  sourceRepoBranch: z.string().min(1).max(120).default("main"),
  provisioningMode: z.enum(["manual", "external", "native"]).default("manual"),
  requirements: z.string().nullable().optional(),
  license: z.string().nullable().optional(),
  included: z.string().nullable().optional(),
  faq: z.string().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
  features: z.array(z.object({ title: z.string().min(2), description: z.string().min(2) })).max(12),
  techStack: z.array(z.object({ name: z.string().min(1), category: z.string().nullable().optional() })).max(16),
});
const productStatusSchema = z.object({ productId: z.number().int().positive(), status: z.enum(["draft", "published", "archived"]) });
const deliveryUpdateSchema = z.object({
  deliveryId: z.number().int().positive(),
  status: z.enum(["queued", "provisioning", "ready", "blocked"]),
  instanceUrl: z.string().url().nullable().optional(),
  adminUrl: z.string().url().nullable().optional(),
  sourceReady: z.boolean(),
  documentationReady: z.boolean(),
  licenseReady: z.boolean(),
});
const orderStatusSchema = z.object({ orderId: z.number().int().positive(), status: z.enum(["fulfilled", "cancelled"]) });
const reviewStatusSchema = z.object({ reviewId: z.number().int().positive(), status: z.enum(["pending", "published", "hidden"]) });
const couponCreateSchema = z.object({ code: z.string().min(3).max(60), discountType: z.enum(["percent", "fixed"]), discountValue: z.string().regex(/^\d+(\.\d{1,2})?$/), expiresAt: z.coerce.date().nullable().optional(), maxUses: z.number().int().positive().nullable().optional() });
const faqGenerationSchema = z.object({
  name: z.string().min(2).max(160), tagline: z.string().min(2).max(240), description: z.string().min(10).max(5000), category: z.string().min(2).max(80), price: z.string().regex(/^\d+(\.\d{1,2})?$/), currency: z.string().length(3), requirements: z.string().max(2000).nullable().optional(), included: z.string().max(2000).nullable().optional(), license: z.string().max(2000).nullable().optional(), techStack: z.array(z.string().min(1).max(80)).max(16),
});
const marketplaceFilterSchema = z.object({ search: z.string().max(80).optional(), category: z.string().max(120).optional() }).optional();
const categoryAdminSchema = z.object({ name: z.string().min(2).max(120), slug: z.string().regex(/^[a-z0-9-]+$/).max(120), description: z.string().max(1000).nullable().optional(), status: z.enum(["draft", "published", "archived"]), sortOrder: z.number().int().min(0).max(10000) });
const categoryStatusSchema = z.object({ categoryId: z.number().int().positive(), status: z.enum(["draft", "published", "archived"]) });
const categoryReorderSchema = z.object({ items: z.array(z.object({ categoryId: z.number().int().positive(), sortOrder: z.number().int().min(0).max(10000) })).max(200) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  platform: router({
    payments: publicProcedure.query(() => getPaymentProvidersAvailability()),
    provisioning: publicProcedure.query(() => getProvisioningCapabilities()),
  }),
  marketplace: router({
    categories: publicProcedure.query(() => listPublishedCategories()),
    list: publicProcedure.input(marketplaceFilterSchema).query(async ({ input }) => {
      await ensureCatalogSeeded();
      return listMarketplaceProducts(input ?? {});
    }),
    getBySlug: publicProcedure.input(productSlugSchema).query(async ({ input }) => {
      const product = await getProductBySlug(input.slug);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Website product not found" });
      return product;
    }),
  }),
  orders: router({
    create: protectedProcedure.input(productSlugSchema).mutation(async ({ ctx, input }) => {
      const product = await getProductBySlug(input.slug);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Website product not found" });
      const order = await createPendingOrder(ctx.user.id, product);
      return { ...order, message: "Order created. Payment provider verification is required before delivery." };
    }),
    checkout: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), provider: z.enum(["stripe", "chargily", "paypal"]).default("stripe") })).mutation(async ({ ctx, input }) => {
      const row = await getCheckoutOrder(ctx.user.id, input.orderId);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Pending order not found" });
      const session = input.provider === "chargily" ? await createChargilyCheckoutSession({ orderId: row.order.id, name: row.item.productName, amount: String(row.item.unitPrice), currency: row.order.currency }) : input.provider === "paypal" ? await createPayPalOrder({ orderId: row.order.id, name: row.item.productName, amount: String(row.item.unitPrice), currency: row.order.currency }) : await createStripeCheckoutSession({ orderId: row.order.id, name: row.item.productName, amount: String(row.item.unitPrice), currency: row.order.currency, customerEmail: row.user.email });
      await recordCheckoutSession(ctx.user.id, row.order.id, session.sessionId, input.provider);
      return session;
    }),
    paypalCapture: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), paypalOrderId: z.string().min(1).max(200) })).mutation(async ({ ctx, input }) => {
      const row = await getPaymentOrderForUser(ctx.user.id, input.orderId);
      if (!row || row.order.provider !== "paypal" || row.order.providerReference !== input.paypalOrderId) throw new TRPCError({ code: "FORBIDDEN", message: "PayPal order does not belong to this account." });
      const capture = await capturePayPalOrder(input.orderId, input.paypalOrderId);
      if (capture.status !== "COMPLETED") throw new TRPCError({ code: "BAD_REQUEST", message: "PayPal payment is not completed." });
      await markOrderPaid(input.orderId, capture.id, `paypal:${input.paypalOrderId}`, "paypal", Math.round(capture.amount * 100), capture.currency);
      return { success: true };
    }),
  }),
  purchases: router({
    mine: protectedProcedure.query(({ ctx }) => getCustomerPurchases(ctx.user.id)),
    notifications: protectedProcedure.query(({ ctx }) => getUserNotifications(ctx.user.id)),
    download: protectedProcedure.input(z.object({ purchaseId: z.number().int().positive(), kind: z.enum(["source", "documentation", "license"]) })).mutation(async ({ ctx, input }) => {
      const result = await getProtectedDownload(ctx.user.id, input.purchaseId, input.kind);
      if (!result) throw new TRPCError({ code: "FORBIDDEN", message: "This protected asset is not available for your account." });
      return result;
    }),
  }),
  reviews: router({
    create: protectedProcedure.input(z.object({ productId: z.number().int().positive(), rating: z.number().int().min(1).max(5), title: z.string().max(180).nullable().optional(), body: z.string().max(5000).nullable().optional() })).mutation(({ ctx, input }) => createCustomerReview(ctx.user.id, input)),
  }),
  coupons: router({
    validate: publicProcedure.input(z.object({ code: z.string().min(3), subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/) })).query(({ input }) => validateCoupon(input.code, input.subtotal)),
  }),
  analytics: router({
    event: publicProcedure.input(z.object({ action: z.enum(["product.view", "demo.open"]), productId: z.number().int().positive().optional() })).mutation(({ input }) => recordAnalyticsEvent(input.action, input.productId)),
  }),
  admin: router({
    overview: adminProcedure.query(() => getAdminOverview()),
    productDemoCheck: adminProcedure.input(z.object({ productId: z.number().int().positive() })).mutation(({ ctx, input }) => checkAdminProductDemo(ctx.user.id, input.productId)),
    products: adminProcedure.query(() => listAdminProducts()),
    categories: adminProcedure.query(() => listAdminCategories()),
    categoryCreate: adminProcedure.input(categoryAdminSchema).mutation(({ ctx, input }) => createAdminCategory(ctx.user.id, input)),
    categoryUpdate: adminProcedure.input(z.object({ categoryId: z.number().int().positive(), data: categoryAdminSchema })).mutation(({ ctx, input }) => updateAdminCategory(ctx.user.id, input.categoryId, input.data)),
    categoryStatus: adminProcedure.input(categoryStatusSchema).mutation(({ ctx, input }) => updateAdminCategoryStatus(ctx.user.id, input.categoryId, input.status)),
    categoryDelete: adminProcedure.input(z.object({ categoryId: z.number().int().positive() })).mutation(({ ctx, input }) => deleteAdminCategory(ctx.user.id, input.categoryId)),
    categoryReorder: adminProcedure.input(categoryReorderSchema).mutation(({ ctx, input }) => reorderAdminCategories(ctx.user.id, input.items)),
    productCreate: adminProcedure.input(productAdminSchema).mutation(({ ctx, input }) => createAdminProduct(ctx.user.id, input)),
    productUpdate: adminProcedure.input(z.object({ productId: z.number().int().positive(), data: productAdminSchema })).mutation(({ ctx, input }) => updateAdminProduct(ctx.user.id, input.productId, input.data)),
    productFaqGenerate: adminProcedure.input(faqGenerationSchema).mutation(({ input }) => generateProductFaq(input)),
    productStatus: adminProcedure.input(productStatusSchema).mutation(({ ctx, input }) => updateAdminProductStatus(ctx.user.id, input.productId, input.status)),
    productDelete: adminProcedure.input(z.object({ productId: z.number().int().positive() })).mutation(({ ctx, input }) => deleteAdminProduct(ctx.user.id, input.productId)),
    orders: adminProcedure.query(() => listAdminOrders()),
    orderStatus: adminProcedure.input(orderStatusSchema).mutation(({ ctx, input }) => updateAdminOrderStatus(ctx.user.id, input.orderId, input.status)),
    deliveries: adminProcedure.query(() => listAdminDeliveries()),
    deliveryUpdate: adminProcedure.input(deliveryUpdateSchema).mutation(({ ctx, input }) => updateAdminDelivery(ctx.user.id, input.deliveryId, input)),
    reviews: adminProcedure.query(() => listAdminReviews()),
    reviewStatus: adminProcedure.input(reviewStatusSchema).mutation(({ ctx, input }) => updateAdminReviewStatus(ctx.user.id, input.reviewId, input.status)),
    coupons: adminProcedure.query(() => listAdminCoupons()),
    couponCreate: adminProcedure.input(couponCreateSchema).mutation(({ ctx, input }) => createAdminCoupon(ctx.user.id, input)),
    couponUpdate: adminProcedure.input(z.object({ couponId: z.number().int().positive(), active: z.boolean(), expiresAt: z.coerce.date().nullable().optional(), maxUses: z.number().int().positive().nullable().optional() })).mutation(({ ctx, input }) => updateAdminCoupon(ctx.user.id, input.couponId, input)),
    systemTruth: adminProcedure.query(async () => {
      const integrations = await probeIntegrations();
      return {
        generatedAt: new Date().toISOString(),
        version: "5.0.0",
        integrations,
        payments: getPaymentProvidersAvailability(),
        provisioning: getProvisioningCapabilities(),
        backup: getBackupStatus(),
      };
    }),
    backupCreate: adminProcedure
      .input(z.object({ reason: z.string().max(120).optional() }).optional())
      .mutation(async ({ input }) => createSystemBackup(input?.reason || "admin")),
    backupValidate: adminProcedure
      .input(z.object({ envelope: z.string().min(10) }))
      .mutation(({ input }) => validateBackupEnvelope(input.envelope)),
    backupRestore: adminProcedure
      .input(z.object({ envelope: z.string().min(10), confirm: z.boolean() }))
      .mutation(async ({ ctx, input }) =>
        restoreFromBackupEnvelope(input.envelope, { confirm: input.confirm, actorUserId: ctx.user.id }),
      ),
    instanceRollback: adminProcedure
      .input(z.object({ instanceId: z.number().int().positive(), reason: z.string().max(240).optional() }))
      .mutation(({ ctx, input }) =>
        rollbackCustomerInstance({ instanceId: input.instanceId, actorUserId: ctx.user.id, reason: input.reason }),
      ),
    orderRefundApply: adminProcedure
      .input(
        z.object({
          orderId: z.number().int().positive(),
          provider: z.string().min(2).max(40),
          providerPaymentId: z.string().optional(),
          revokeAccess: z.boolean().optional(),
        }),
      )
      .mutation(({ input }) =>
        applyVerifiedRefund({
          orderId: input.orderId,
          provider: input.provider,
          providerPaymentId: input.providerPaymentId,
          revokeAccess: input.revokeAccess,
        }),
      ),
  }),
});

export type AppRouter = typeof appRouter;
