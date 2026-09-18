import { timingSafeEqual } from "node:crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

function loginPage(errorMessage?: string) {
  const safeError = errorMessage
    ? `<div style="margin:0 0 16px;padding:12px 14px;border:1px solid #7f1d1d;background:#2a0f12;border-radius:12px;color:#fecaca;">${errorMessage}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>NUMI Owner Access</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050816;color:#fff;font-family:Inter,system-ui,sans-serif}
.card{width:min(420px,calc(100vw - 32px));padding:28px;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(10,14,32,.88);box-shadow:0 24px 80px rgba(0,0,0,.45)}
h1{margin:0 0 8px;font-size:24px}p{color:#aab1c5;line-height:1.5}label{display:block;margin:18px 0 8px;color:#d9def0}input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:#0a1024;color:#fff}button{width:100%;margin-top:14px;padding:12px 14px;border:0;border-radius:12px;background:#fff;color:#050816;font-weight:700;cursor:pointer}
</style>
</head>
<body>
<main class="card">
  <h1>NUMI Owner Access</h1>
  <p>Enter your owner access code to continue.</p>
  ${safeError}
  <form method="post" action="/api/auth/manus-key/login">
    <label for="code">Owner access code</label>
    <input id="code" name="code" type="password" autocomplete="current-password" required autofocus />
    <button type="submit">Continue</button>
  </form>
</main>
</body>
</html>`;
}

export function registerManusApiKeyAuthRoute(app: any) {
  app.get("/api/auth/manus-key/login", async (_req: any, res: any) => {
    if (!ENV.manusApiKey || !ENV.adminLoginCode) {
      res.status(503).send("NUMI owner login is not configured. Set MANUS_API_KEY and ADMIN_LOGIN_CODE in Vercel.");
      return;
    }
    res.status(200).type("html").send(loginPage());
  });

  app.post("/api/auth/manus-key/login", async (req: any, res: any) => {
    try {
      if (!ENV.manusApiKey || !ENV.adminLoginCode) {
        res.status(503).type("html").send(loginPage("Owner login is not configured."));
        return;
      }

      const submittedCode =
        typeof req.body?.code === "string" ? req.body.code.trim() : "";

      if (!safeEqual(submittedCode, ENV.adminLoginCode)) {
        res.status(401).type("html").send(loginPage("Invalid owner access code."));
        return;
      }

      const userInfo = await sdk.getUserInfoByApiKey();
      if (!userInfo.openId) {
        res.status(503).type("html").send(loginPage("Manus API key did not return a user id."));
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
      res.status(503).type("html").send(loginPage("Owner login failed. Check the Manus API key configuration."));
    }
  });
}
