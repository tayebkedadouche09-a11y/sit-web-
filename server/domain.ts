/**
 * Domain lifecycle — Vercel domains when token present.
 * States: PENDING | VERIFYING | CONNECTED | SSL_READY | ERROR | NOT_CONFIGURED
 */
import { ENV } from "./_core/env";

export type DomainStatus = "PENDING" | "VERIFYING" | "CONNECTED" | "SSL_READY" | "ERROR" | "NOT_CONFIGURED";

export type DomainResult = {
  status: DomainStatus;
  domain?: string;
  verified?: boolean;
  error?: string;
};

export function getDomainProviderStatus(): { configured: boolean; detail: string } {
  if (!ENV.vercelToken) return { configured: false, detail: "VERCEL_TOKEN required for domain attach" };
  return { configured: true, detail: "Vercel domain API available" };
}

export async function attachDomainToProject(projectId: string, domain: string): Promise<DomainResult> {
  if (!ENV.vercelToken) {
    return { status: "NOT_CONFIGURED", domain, error: "VERCEL_TOKEN missing" };
  }
  try {
    const team = ENV.vercelTeamId ? `?teamId=${encodeURIComponent(ENV.vercelTeamId)}` : "";
    const res = await fetch(`${ENV.vercelApiUrl.replace(/\/$/, "")}/v10/projects/${encodeURIComponent(projectId)}/domains${team}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });
    const data = (await res.json()) as { name?: string; verified?: boolean; error?: { message?: string } };
    if (!res.ok) return { status: "ERROR", domain, error: data.error?.message || `HTTP ${res.status}` };
    if (data.verified) return { status: "CONNECTED", domain: data.name || domain, verified: true };
    return { status: "VERIFYING", domain: data.name || domain, verified: false };
  } catch (e) {
    return { status: "ERROR", domain, error: e instanceof Error ? e.message : "domain attach failed" };
  }
}
