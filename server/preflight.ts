/**
 * NUMI Preflight — run before production start.
 * Reports READY | NOT_CONFIGURED | ERROR for every integration.
 * Usage: pnpm preflight  (or npm run preflight)
 */
import "dotenv/config";
import { ENV } from "./_core/env";
import { getStaticIntegrationReports, probeIntegrations } from "./integrations";

export type PreflightItem = {
  id: string;
  name: string;
  status: "READY" | "NOT_CONFIGURED" | "ERROR" | "OPTIONAL";
  required: boolean;
  detail: string;
};

function item(
  id: string,
  name: string,
  ok: boolean,
  required: boolean,
  detailOk: string,
  detailMissing: string,
): PreflightItem {
  if (ok) return { id, name, status: "READY", required, detail: detailOk };
  return {
    id,
    name,
    status: required ? "NOT_CONFIGURED" : "OPTIONAL",
    required,
    detail: detailMissing,
  };
}

export async function runPreflight(probeDb = true): Promise<{
  ok: boolean;
  canSell: boolean;
  canDeliverNative: boolean;
  items: PreflightItem[];
}> {
  const items: PreflightItem[] = [];

  items.push(
    item(
      "database",
      "Database",
      Boolean(ENV.databaseUrl),
      true,
      "DATABASE_URL is set",
      "Set DATABASE_URL (PostgreSQL / Supabase connection string)",
    ),
  );
  items.push(
    item(
      "app_url",
      "Public app URL",
      Boolean(ENV.appOrigin),
      true,
      `Origin: ${ENV.appOrigin}`,
      "Set PUBLIC_APP_URL to your public HTTPS origin",
    ),
  );
  items.push(
    item(
      "auth_secret",
      "Auth / session secret",
      Boolean(ENV.cookieSecret && ENV.cookieSecret.length >= 16),
      true,
      "JWT_SECRET is set",
      "Set JWT_SECRET (min 16 characters, prefer 32+)",
    ),
  );
  items.push(
    item(
      "oauth",
      "OAuth portal",
      Boolean(ENV.oAuthServerUrl && ENV.appId),
      true,
      "OAuth server + VITE_APP_ID present",
      "Set OAUTH_SERVER_URL and VITE_APP_ID for login",
    ),
  );

  const payments =
    Boolean(ENV.stripeSecretKey && ENV.stripeWebhookSecret) ||
    Boolean(ENV.chargilySecretKey) ||
    Boolean(ENV.paypalClientId && ENV.paypalClientSecret);
  items.push(
    item(
      "payments",
      "At least one payment provider",
      payments,
      true,
      "One or more payment providers configured",
      "Set Stripe and/or Chargily and/or PayPal keys",
    ),
  );

  items.push(
    item(
      "stripe",
      "Stripe",
      Boolean(ENV.stripeSecretKey && ENV.stripeWebhookSecret && ENV.appOrigin),
      false,
      "Stripe ready",
      "Optional: STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET",
    ),
  );
  items.push(
    item(
      "chargily",
      "Chargily",
      Boolean(ENV.chargilySecretKey && ENV.appOrigin),
      false,
      "Chargily ready",
      "Optional: CHARGILY_SECRET_KEY",
    ),
  );
  items.push(
    item(
      "paypal",
      "PayPal",
      Boolean(ENV.paypalClientId && ENV.paypalClientSecret && ENV.appOrigin),
      false,
      "PayPal ready",
      "Optional: PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET",
    ),
  );

  const github = Boolean(ENV.githubToken && ENV.githubOwner);
  const vercel = Boolean(ENV.vercelToken);
  items.push(
    item(
      "github",
      "GitHub provisioning",
      github,
      false,
      "GitHub ready for customer repos",
      "Optional for auto-delivery: GITHUB_TOKEN + GITHUB_OWNER",
    ),
  );
  items.push(
    item(
      "vercel",
      "Vercel provisioning",
      vercel,
      false,
      "Vercel ready for customer deploys",
      "Optional for auto-delivery: VERCEL_TOKEN",
    ),
  );
  items.push(
    item(
      "native_pipeline",
      "Native delivery pipeline",
      github && vercel && ENV.featureNativeProvisioning,
      false,
      "Native GitHub+Vercel delivery enabled",
      "Needs GITHUB_* + VERCEL_TOKEN for automatic customer instances",
    ),
  );

  const customerDb =
    ENV.customerDbProvider !== "none" &&
    ((ENV.customerDbProvider === "neon" && Boolean(ENV.neonApiKey)) ||
      (ENV.customerDbProvider === "supabase" && Boolean(ENV.supabaseAccessToken)));
  items.push(
    item(
      "customer_db",
      "Customer database provider",
      customerDb,
      false,
      `Provider: ${ENV.customerDbProvider}`,
      "Optional: CUSTOMER_DB_PROVIDER + provider API keys",
    ),
  );

  items.push(
    item(
      "email",
      "Email notifications",
      ENV.emailProvider !== "none" &&
        (Boolean(ENV.resendApiKey) || Boolean(ENV.postmarkServerToken) || Boolean(ENV.smtpHost)),
      false,
      `Provider: ${ENV.emailProvider}`,
      "Optional: EMAIL_PROVIDER + provider keys",
    ),
  );

  items.push(
    item(
      "ai",
      "AI FAQ",
      Boolean(ENV.forgeApiUrl && ENV.forgeApiKey),
      false,
      "AI credentials present",
      "Optional: BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY",
    ),
  );

  items.push(
    item(
      "worker",
      "Automation worker secret",
      Boolean(ENV.automationWorkerSecret),
      false,
      "Worker auth secret set",
      "Optional: AUTOMATION_WORKER_SECRET for secured worker endpoint",
    ),
  );

  if (probeDb && ENV.databaseUrl) {
    try {
      const reports = await probeIntegrations();
      const db = reports.find((r) => r.id === "database");
      if (db?.status === "ERROR") {
        const row = items.find((i) => i.id === "database");
        if (row) {
          row.status = "ERROR";
          row.detail = db.error || db.detail;
        }
      }
    } catch (e) {
      const row = items.find((i) => i.id === "database");
      if (row) {
        row.status = "ERROR";
        row.detail = e instanceof Error ? e.message : "DB probe failed";
      }
    }
  }

  const requiredOk = items.filter((i) => i.required).every((i) => i.status === "READY");
  const canSell = requiredOk && payments;
  const canDeliverNative = github && vercel && ENV.featureNativeProvisioning;

  return {
    ok: requiredOk && !items.some((i) => i.status === "ERROR"),
    canSell,
    canDeliverNative,
    items,
  };
}

async function main() {
  const result = await runPreflight(true);
  console.log("\n========== NUMI PREFLIGHT ==========\n");
  for (const i of result.items) {
    const mark =
      i.status === "READY" ? "✓" : i.status === "ERROR" ? "✗" : i.status === "OPTIONAL" ? "○" : "!";
    console.log(`  ${mark} [${i.status}] ${i.name}`);
    console.log(`      ${i.detail}`);
  }
  console.log("\n------------------------------------");
  console.log(`  Boot OK:           ${result.ok ? "YES" : "NO (fix required NOT_CONFIGURED / ERROR)"}`);
  console.log(`  Can accept sales:  ${result.canSell ? "YES" : "NO"}`);
  console.log(`  Native delivery:   ${result.canDeliverNative ? "YES" : "NOT_CONFIGURED (manual delivery still possible)"}`);
  console.log("\n  Only edit .env — never source files.\n");
  process.exit(result.ok ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("preflight.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
