import { ENV } from "./_core/env";

export function isVercelConfigured() { return Boolean(ENV.vercelToken); }

async function vercelRequest<T>(path: string, init: RequestInit = {}) {
  if (!ENV.vercelToken) throw new Error("Vercel provisioning is not configured. Set VERCEL_TOKEN.");
  const response = await fetch(`${ENV.vercelApiUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${ENV.vercelToken}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `Vercel API failed (${response.status})`);
  return payload as T;
}

export async function createVercelProject(repo: { owner: string; repo: string; branch: string }, slug: string) {
  const projectName = `numi-${slug}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 90);
  const teamQuery = ENV.vercelTeamId ? `?teamId=${encodeURIComponent(ENV.vercelTeamId)}` : "";
  // Idempotent: reuse project if it already exists (retry-safe).
  let project: { id?: string; name?: string; targets?: { production?: { url?: string } }; alias?: string[] };
  try {
    project = await vercelRequest(`/v9/projects/${encodeURIComponent(projectName)}${teamQuery}`);
  } catch {
    project = await vercelRequest(`/v10/projects${teamQuery}`, {
      method: "POST",
      body: JSON.stringify({
        name: projectName,
        gitRepository: { type: "github", repo: `${repo.owner}/${repo.repo}`, productionBranch: repo.branch },
      }),
    });
  }
  const projectId = project.id ?? project.name ?? projectName;
  const immediateUrl = project.alias?.[0] ? `https://${project.alias[0]}` : project.targets?.production?.url ? `https://${project.targets.production.url}` : undefined;
  if (immediateUrl) return { id: projectId, url: immediateUrl };

  // Git-connected projects may start their first deployment asynchronously. Poll briefly
  // so the purchase workflow can return a real URL instead of inventing one.
  const query = `?projectId=${encodeURIComponent(projectId)}&limit=5${ENV.vercelTeamId ? `&teamId=${encodeURIComponent(ENV.vercelTeamId)}` : ""}`;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const deployments = await vercelRequest<{ deployments?: Array<{ uid?: string; url?: string; state?: string }> }>(`/v6/deployments${query}`);
    const deployment = deployments.deployments?.find(item => item.state === "READY" && item.url);
    if (deployment?.url) return { id: deployment.uid ?? projectId, url: `https://${deployment.url}` };
    const failed = deployments.deployments?.find(item => ["ERROR", "CANCELED"].includes(item.state ?? ""));
    if (failed) throw new Error("Vercel created the customer project but its first deployment failed.");
  }
  throw new Error("Vercel project was created, but no ready production deployment appeared yet.");
}
