import { redactString } from "./security/redact";
/**
 * Customer database provider abstraction.
 * Configure via .env only (CUSTOMER_DB_PROVIDER + provider keys).
 * Returns NOT_CONFIGURED when keys missing — never fakes success.
 */
import { ENV } from "./_core/env";

export type CustomerDbResult = {
  status: "CREATED" | "NOT_CONFIGURED" | "ERROR";
  provider: string;
  databaseId?: string;
  connectionUrl?: string;
  error?: string;
};

export function getCustomerDbProviderStatus(): {
  provider: string;
  configured: boolean;
  detail: string;
} {
  const p = ENV.customerDbProvider || "none";
  if (p === "none" || !p) {
    return { provider: "none", configured: false, detail: "CUSTOMER_DB_PROVIDER=none" };
  }
  if (p === "neon") {
    const ok = Boolean(ENV.neonApiKey);
    return { provider: "neon", configured: ok, detail: ok ? "Neon API key present" : "Set NEON_API_KEY" };
  }
  if (p === "supabase") {
    const ok = Boolean(ENV.supabaseAccessToken);
    return {
      provider: "supabase",
      configured: ok,
      detail: ok ? "Supabase token present" : "Set SUPABASE_ACCESS_TOKEN",
    };
  }
  return { provider: p, configured: false, detail: `Unknown provider: ${p}` };
}

/**
 * Create an isolated database for a customer instance.
 * Does not invent URLs — only returns what the provider actually gives.
 */
export async function createCustomerDatabase(opts: {
  instanceKey: string;
  productSlug: string;
}): Promise<CustomerDbResult> {
  const status = getCustomerDbProviderStatus();
  if (!status.configured) {
    return {
      status: "NOT_CONFIGURED",
      provider: status.provider,
      error: status.detail,
    };
  }

  const name = `numi_${opts.productSlug}_${opts.instanceKey}`.replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 60);

  try {
    if (status.provider === "neon" && ENV.neonApiKey) {
      // Neon project branch API — requires project id for branch create
      if (!ENV.neonProjectId) {
        return {
          status: "NOT_CONFIGURED",
          provider: "neon",
          error: "NEON_PROJECT_ID required to create customer branches",
        };
      }
      const res = await fetch(`https://console.neon.tech/api/v2/projects/${ENV.neonProjectId}/branches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.neonApiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          branch: { name },
          endpoints: [{ type: "read_write" }],
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        branch?: { id?: string };
        endpoints?: Array<{ host?: string }>;
        connection_uris?: Array<{ connection_uri?: string }>;
        message?: string;
      };
      if (!res.ok) {
        return {
          status: "ERROR",
          provider: "neon",
          error: body.message || `Neon API ${res.status}`,
        };
      }
      const connectionUrl = body.connection_uris?.[0]?.connection_uri;
      return {
        status: connectionUrl ? "CREATED" : "ERROR",
        provider: "neon",
        databaseId: body.branch?.id,
        connectionUrl,
        error: connectionUrl ? undefined : "Neon returned no connection URI",
      };
    }

    // Other providers: architecture ready, explicit NOT_CONFIGURED until fully wired
    return {
      status: "NOT_CONFIGURED",
      provider: status.provider,
      error: `Provider ${status.provider} is recognized but live create is not fully wired for this environment. Use native GitHub+Vercel delivery without isolated DB, or complete provider API wiring.`,
    };
  } catch (e) {
    return {
      status: "ERROR",
      provider: status.provider,
      error: e instanceof Error ? redactString(e.message) : "Customer DB create failed",
    };
  }
}
