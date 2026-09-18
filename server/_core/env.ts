/**
 * NUMI environment — single source of configuration.
 * Owner only edits .env. Never hardcode secrets in source.
 */

function first(...vals: Array<string | undefined>) {
  for (const v of vals) {
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

export const ENV = {
  appId: first(process.env.VITE_APP_ID),
  cookieSecret: first(process.env.JWT_SECRET, process.env.AUTH_SECRET, process.env.SESSION_SECRET),
  databaseUrl: first(process.env.DATABASE_URL),
  oAuthServerUrl: first(process.env.OAUTH_SERVER_URL) || "https://api.manus.ai",
  oauthPortalUrl: first(process.env.VITE_OAUTH_PORTAL_URL) || "https://manus.im/openapi/oauth",
  manusClientSecret: first(process.env.MANUS_CLIENT_SECRET),
  ownerOpenId: first(process.env.OWNER_OPEN_ID),
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT || 3000) || 3000,
  appOrigin: first(process.env.PUBLIC_APP_URL, process.env.VITE_APP_URL, process.env.APP_URL),

  forgeApiUrl: first(process.env.BUILT_IN_FORGE_API_URL),
  forgeApiKey: first(process.env.BUILT_IN_FORGE_API_KEY, process.env.AI_PROVIDER_KEY),

  stripeSecretKey: first(process.env.STRIPE_SECRET_KEY),
  stripePublishableKey: first(process.env.VITE_STRIPE_PUBLISHABLE_KEY),
  stripeWebhookSecret: first(process.env.STRIPE_WEBHOOK_SECRET),

  chargilySecretKey: first(process.env.CHARGILY_SECRET_KEY, process.env.CHARGILY_API_KEY),
  chargilyApiUrl: first(process.env.CHARGILY_API_URL) || "https://pay.chargily.net/api/v2",

  paypalClientId: first(process.env.PAYPAL_CLIENT_ID),
  paypalClientSecret: first(process.env.PAYPAL_CLIENT_SECRET),
  paypalApiUrl: first(process.env.PAYPAL_API_URL) || "https://api-m.paypal.com",
  paypalWebhookId: first(process.env.PAYPAL_WEBHOOK_ID),

  githubToken: first(process.env.GITHUB_TOKEN),
  githubOwner: first(process.env.GITHUB_OWNER, process.env.GITHUB_ORG),
  githubApiUrl: first(process.env.GITHUB_API_URL) || "https://api.github.com",

  vercelToken: first(process.env.VERCEL_TOKEN),
  vercelTeamId: first(process.env.VERCEL_TEAM_ID),
  vercelApiUrl: first(process.env.VERCEL_API_URL) || "https://api.vercel.com",

  provisioningApiUrl: first(process.env.PROVISIONING_API_URL),
  provisioningApiKey: first(process.env.PROVISIONING_API_KEY),
  automationWorkerSecret: first(process.env.AUTOMATION_WORKER_SECRET),

  customerDbProvider: first(process.env.CUSTOMER_DB_PROVIDER) || "none",
  neonApiKey: first(process.env.NEON_API_KEY),
  neonOrgId: first(process.env.NEON_ORG_ID),
  neonProjectId: first(process.env.NEON_PROJECT_ID),
  supabaseAccessToken: first(process.env.SUPABASE_ACCESS_TOKEN),
  supabaseOrgId: first(process.env.SUPABASE_ORG_ID),

  secretsEncryptionKey: first(process.env.SECRETS_ENCRYPTION_KEY),

  emailProvider: first(process.env.EMAIL_PROVIDER) || "none",
  emailFrom: first(process.env.EMAIL_FROM),
  resendApiKey: first(process.env.RESEND_API_KEY),
  postmarkServerToken: first(process.env.POSTMARK_SERVER_TOKEN),
  smtpHost: first(process.env.SMTP_HOST),
  smtpPort: Number(process.env.SMTP_PORT || 587) || 587,
  smtpUser: first(process.env.SMTP_USER),
  smtpPass: first(process.env.SMTP_PASS),

  storageProvider: first(process.env.STORAGE_PROVIDER) || "none",
  s3Bucket: first(process.env.S3_BUCKET),
  s3Region: first(process.env.S3_REGION),
  s3AccessKeyId: first(process.env.S3_ACCESS_KEY_ID),
  s3SecretAccessKey: first(process.env.S3_SECRET_ACCESS_KEY),
  s3Endpoint: first(process.env.S3_ENDPOINT),

  monitoringWebhookUrl: first(process.env.MONITORING_WEBHOOK_URL),
  backupWebhookUrl: first(process.env.BACKUP_WEBHOOK_URL),
  sentryDsn: first(process.env.SENTRY_DSN),

  featureNativeProvisioning: (process.env.FEATURE_NATIVE_PROVISIONING ?? "true") !== "false",
  featureChargily: (process.env.FEATURE_CHARGILY ?? "true") !== "false",
  featureAiFaq: (process.env.FEATURE_AI_FAQ ?? "true") !== "false",
};
