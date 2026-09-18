/**
 * NUMI System Truth — real configuration + optional live probes.
 * Never reports CONNECTED without evidence.
 */
import { ENV } from "./_core/env";
import { isGitHubConfigured } from "./github";
import { isVercelConfigured } from "./vercel";
import { getDb } from "./db";
import { getCustomerDbProviderStatus } from "./databaseProvider";
import { getEmailStatus } from "./email";
import { isSecretsEncryptionConfigured } from "./secrets";
import { getBackupStatus } from "./backup";
import { getDomainProviderStatus } from "./domain";
import { users } from "../drizzle/schema";

export type IntegrationStatus = "CONNECTED" | "NOT_CONFIGURED" | "DEGRADED" | "ERROR";

export type IntegrationReport = {
  id: string;
  name: string;
  status: IntegrationStatus;
  configured: boolean;
  requiredEnv: string[];
  detail: string;
  lastCheckedAt: string;
  error?: string;
};

function base(
  id: string,
  name: string,
  configured: boolean,
  requiredEnv: string[],
  detail: string,
  status?: IntegrationStatus,
  error?: string,
): IntegrationReport {
  return {
    id,
    name,
    status: status ?? (configured ? "CONNECTED" : "NOT_CONFIGURED"),
    configured,
    requiredEnv,
    detail,
    lastCheckedAt: new Date().toISOString(),
    error,
  };
}

export function getStaticIntegrationReports(): IntegrationReport[] {
  const stripeOk = Boolean(ENV.stripeSecretKey && ENV.stripeWebhookSecret && ENV.appOrigin);
  const chargilyOk = Boolean(ENV.chargilySecretKey && ENV.appOrigin);
  const paypalOk = Boolean(ENV.paypalClientId && ENV.paypalClientSecret && ENV.appOrigin);
  const githubOk = isGitHubConfigured();
  const vercelOk = isVercelConfigured();
  const nativeReady = githubOk && vercelOk;
  const externalProv = Boolean(ENV.provisioningApiUrl && ENV.provisioningApiKey);
  const dbOk = Boolean(ENV.databaseUrl);
  const oauthOk = Boolean(ENV.oAuthServerUrl && ENV.appId && ENV.cookieSecret);
  const aiOk = Boolean(ENV.forgeApiUrl && ENV.forgeApiKey);
  const workerOk = Boolean(ENV.automationWorkerSecret);

  return [
    base("database", "Database (PostgreSQL / Supabase)", dbOk, ["DATABASE_URL"], dbOk ? "DATABASE_URL is set. Connectivity is verified on demand." : "No DATABASE_URL (Postgres). Catalog, orders, and deliveries cannot persist."),
    base("auth", "Authentication (OAuth)", oauthOk, ["OAUTH_SERVER_URL", "VITE_APP_ID", "JWT_SECRET"], oauthOk ? "OAuth portal configuration present." : "Login will fail until OAuth env vars are set."),
    base("stripe", "Stripe Checkout", stripeOk, ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PUBLIC_APP_URL", "VITE_STRIPE_PUBLISHABLE_KEY"], stripeOk ? "Stripe secrets and PUBLIC_APP_URL present. Webhooks must still be pointed at this app." : "Stripe checkout is NOT_CONFIGURED."),
    base("chargily", "Chargily Pay (DZD)", chargilyOk, ["CHARGILY_SECRET_KEY", "PUBLIC_APP_URL"], chargilyOk ? "Chargily secret present." : "Chargily is NOT_CONFIGURED."),
    base("paypal", "PayPal Checkout", paypalOk, ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PUBLIC_APP_URL"], paypalOk ? "PayPal credentials present." : "PayPal is NOT_CONFIGURED."),
    base("github", "GitHub (customer repos)", githubOk, ["GITHUB_TOKEN", "GITHUB_OWNER"], githubOk ? "GitHub token + owner present." : "GitHub is NOT_CONFIGURED."),
    base("vercel", "Vercel (customer deploy)", vercelOk, ["VERCEL_TOKEN", "VERCEL_TEAM_ID?"], vercelOk ? "Vercel token present." : "Vercel is NOT_CONFIGURED."),
    base("native_pipeline", "Native provision pipeline (GitHub + Vercel)", nativeReady, ["GITHUB_TOKEN", "GITHUB_OWNER", "VERCEL_TOKEN"], nativeReady ? "Native mode can create private customer repos and Vercel projects." : "Native pipeline blocked until both GitHub and Vercel are configured."),
    base("external_provisioning", "External provisioning worker", externalProv, ["PROVISIONING_API_URL", "PROVISIONING_API_KEY"], externalProv ? "External worker URL + key present." : "No external worker. Manual handover or native mode only."),
    base("automation_worker", "Automation worker secret", workerOk, ["AUTOMATION_WORKER_SECRET"], workerOk ? "Worker endpoint can be authenticated." : "Worker secret missing."),
    base("ai", "AI (FAQ / copilot)", aiOk, ["BUILT_IN_FORGE_API_URL", "BUILT_IN_FORGE_API_KEY"], aiOk ? "Forge AI credentials present." : "AI features are NOT_CONFIGURED."),
    base("customer_db", "Customer database provider", getCustomerDbProviderStatus().configured, ["CUSTOMER_DB_PROVIDER", "NEON_API_KEY?"], getCustomerDbProviderStatus().detail),
    base("email", "Email notifications", getEmailStatus().configured, ["EMAIL_PROVIDER", "EMAIL_FROM"], getEmailStatus().detail),
    base("secrets", "Secrets encryption", isSecretsEncryptionConfigured(), ["SECRETS_ENCRYPTION_KEY"], isSecretsEncryptionConfigured() ? "AES-256-GCM encryption key present." : "SECRETS_ENCRYPTION_KEY not set. Secrets will not be persisted until SECRETS_ENCRYPTION_KEY is set."),
    base("backup", "Backups", getBackupStatus().configured, ["BACKUP_WEBHOOK_URL", "S3_*"], getBackupStatus().detail),
    base("domains", "Custom domains (Vercel)", getDomainProviderStatus().configured, ["VERCEL_TOKEN"], getDomainProviderStatus().detail),
    base("app_origin", "Public app URL", Boolean(ENV.appOrigin), ["PUBLIC_APP_URL"], ENV.appOrigin ? `Origin: ${ENV.appOrigin}` : "PUBLIC_APP_URL missing."),
  ];
}

export async function probeIntegrations(): Promise<IntegrationReport[]> {
  const reports = getStaticIntegrationReports();
  const out: IntegrationReport[] = [];

  for (const report of reports) {
    if (report.id === "database" && report.configured) {
      try {
        const db = await getDb();
        if (!db) {
          out.push({ ...report, status: "ERROR", detail: "DATABASE_URL set but getDb() returned null.", error: "db_null", lastCheckedAt: new Date().toISOString() });
          continue;
        }
        await db.select({ id: users.id }).from(users).limit(1);
        out.push({ ...report, status: "CONNECTED", detail: "DATABASE_URL set and a simple users query succeeded.", lastCheckedAt: new Date().toISOString() });
      } catch (e) {
        out.push({
          ...report,
          status: "ERROR",
          detail: "DATABASE_URL set but connectivity/query failed.",
          error: e instanceof Error ? e.message : "db_probe_failed",
          lastCheckedAt: new Date().toISOString(),
        });
      }
      continue;
    }
    out.push(report);
  }

  return out;
}

export function getPaymentProvidersAvailability() {
  return {
    stripe: Boolean(ENV.stripeSecretKey && ENV.stripeWebhookSecret && ENV.appOrigin),
    chargily: Boolean(ENV.chargilySecretKey && ENV.appOrigin),
    paypal: Boolean(ENV.paypalClientId && ENV.paypalClientSecret && ENV.appOrigin),
  };
}

export function getProvisioningCapabilities() {
  return {
    native: isGitHubConfigured() && isVercelConfigured(),
    external: Boolean(ENV.provisioningApiUrl && ENV.provisioningApiKey),
    manual: true,
  };
}
