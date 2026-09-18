import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export function registerManusApiKeyAuthRoute(app: any) {
  app.get("/api/auth/manus-key/login", async (req: any, res: any) => {
    try {
      const userInfo = await sdk.getUserInfoByApiKey();

      if (!userInfo.openId) {
        res.status(503).json({ error: "Manus API key did not return a user id" });
        return;
      }

      const signedInAt = new Date();

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: "manus-api-key",
        role: "admin",
        lastSignedIn: signedInAt,
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "Manus User",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[Auth] Manus API key login failed", error);
      res.status(503).json({
        error: "Manus API key login is not configured or is invalid",
      });
    }
  });
}
