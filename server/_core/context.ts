import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import * as db from "../db";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://nayijjvllvypjmuochfs.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_-7P93kwkBl_aZBkqujbYXQ_xqpErM3G";

async function authenticateSupabase(req: any): Promise<User | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  try {
    const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) return null;

    const identity = await response.json();
    if (!identity?.id) return null;

    return db.upsertUser({
      openId: "supabase:" + identity.id,
      name:
        identity.user_metadata?.full_name ||
        identity.user_metadata?.name ||
        identity.email ||
        null,
      email: identity.email || null,
      loginMethod: identity.app_metadata?.provider || "supabase",
      lastSignedIn: new Date(),
    });
  } catch {
    return null;
  }
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // NUMI customer/owner sessions now use Supabase Auth. Prefer it so a
  // Supabase JWT is never sent through the legacy Manus JWT verifier.
  let user = await authenticateSupabase(opts.req);

  // Keep the legacy Manus session as a fallback for older owner sessions.
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return { req: opts.req, res: opts.res, user };
}
