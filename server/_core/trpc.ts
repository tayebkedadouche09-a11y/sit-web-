import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from "./env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    const isSupabaseOwner =
      ctx.user?.role === "admin" && ctx.user.openId.startsWith("supabase:");
    const isLegacyOwner =
      ctx.user?.role === "admin" &&
      Boolean(ENV.ownerOpenId) &&
      ctx.user.openId === ENV.ownerOpenId;

    // Supabase is the primary NUMI auth system. A server-side admin role on a
    // Supabase identity is the owner authorization path; OWNER_OPEN_ID remains
    // supported for legacy Manus owner sessions.
    if (!ctx.user || ctx.user.role !== "admin" || (!isSupabaseOwner && !isLegacyOwner)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
