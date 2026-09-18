import { ENV } from "./_core/env";

export type GitHubRepo = { owner: string; repo: string; branch: string };

type GitHubTreeEntry = { path: string; mode: string; type: "blob" | "tree"; sha: string; size?: number };

type GitHubResponse<T> = T & { message?: string };

function githubConfigured() {
  return Boolean(ENV.githubToken && ENV.githubOwner);
}

function parseRepo(url: string): { owner: string; repo: string } {
  const parsed = new URL(url);
  if (parsed.hostname !== "github.com") throw new Error("Only github.com repository URLs are supported.");
  const [owner, repo] = parsed.pathname.replace(/^\//, "").split("/").filter(Boolean);
  if (!owner || !repo) throw new Error("Invalid GitHub repository URL.");
  return { owner, repo: repo.replace(/\.git$/, "") };
}

async function githubFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!ENV.githubToken) throw new Error("GitHub integration is not configured.");
  const response = await fetch(`${ENV.githubApiUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${ENV.githubToken}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const payload = await response.json().catch(() => ({})) as GitHubResponse<T>;
  if (!response.ok) throw new Error(payload.message ?? `GitHub API request failed (${response.status})`);
  return payload as T;
}

export function isGitHubConfigured() { return githubConfigured(); }

export async function inspectGitHubRepository(url: string, branch = "main") {
  const source = parseRepo(url);
  const ref = await githubFetch<{ object: { sha: string } }>(`/repos/${source.owner}/${source.repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  const tree = await githubFetch<{ tree: GitHubTreeEntry[]; truncated: boolean }>(`/repos/${source.owner}/${source.repo}/git/trees/${ref.object.sha}?recursive=1`);
  const files = tree.tree.filter(entry => entry.type === "blob");
  return { ...source, branch, commitSha: ref.object.sha, fileCount: files.length, truncated: tree.truncated };
}

export async function createCustomerRepository(sourceUrl: string, sourceBranch: string, customerId: number, productSlug: string): Promise<GitHubRepo> {
  if (!githubConfigured()) throw new Error("GitHub provisioning is not configured. Set GITHUB_TOKEN and GITHUB_OWNER.");
  const source = parseRepo(sourceUrl);
  const targetName = `numi-${productSlug}-${customerId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 90);

  // Idempotent: if repo already exists for this purchase, reuse it (retry-safe).
  try {
    const existing = await githubFetch<{ name: string; default_branch?: string }>(
      `/repos/${encodeURIComponent(ENV.githubOwner)}/${encodeURIComponent(targetName)}`,
    );
    if (existing?.name) {
      return { owner: ENV.githubOwner, repo: existing.name, branch: existing.default_branch || "main" };
    }
  } catch {
    // 404 expected when repo does not exist yet
  }

  const me = await githubFetch<{ login: string }>(`/user`);
  const createPath = me.login.toLowerCase() === ENV.githubOwner.toLowerCase() ? `/user/repos` : `/orgs/${encodeURIComponent(ENV.githubOwner)}/repos`;
  const target = await githubFetch<{ html_url: string; name: string }>(createPath, {
    method: "POST",
    body: JSON.stringify({ name: targetName, private: true, description: `NUMI customer instance ${customerId} — ${productSlug}`, auto_init: false }),
  });

  const ref = await githubFetch<{ object: { sha: string } }>(`/repos/${source.owner}/${source.repo}/git/ref/heads/${encodeURIComponent(sourceBranch)}`);
  const sourceTree = await githubFetch<{ tree: GitHubTreeEntry[]; truncated: boolean }>(`/repos/${source.owner}/${source.repo}/git/trees/${ref.object.sha}?recursive=1`);
  if (sourceTree.truncated) throw new Error("Source repository tree is too large for safe automatic cloning. Use the external provisioning worker.");

  const entries = sourceTree.tree.filter(entry => entry.type === "blob");
  const targetTree: Array<{ path: string; mode: "100644"; type: "blob"; sha: string }> = [];
  for (const entry of entries) {
    if (entry.size && entry.size > 2_000_000) throw new Error(`Source file ${entry.path} is too large for native provisioning.`);
    const blob = await githubFetch<{ content: string; encoding: string }>(`/repos/${source.owner}/${source.repo}/git/blobs/${entry.sha}`);
    const created = await githubFetch<{ sha: string }>(`/repos/${ENV.githubOwner}/${target.name}/git/blobs`, { method: "POST", body: JSON.stringify({ content: blob.content.replace(/\n/g, ""), encoding: blob.encoding }) });
    targetTree.push({ path: entry.path, mode: "100644", type: "blob", sha: created.sha });
  }

  const newTree = await githubFetch<{ sha: string }>(`/repos/${ENV.githubOwner}/${target.name}/git/trees`, { method: "POST", body: JSON.stringify({ tree: targetTree }) });
  const commit = await githubFetch<{ sha: string }>(`/repos/${ENV.githubOwner}/${target.name}/git/commits`, { method: "POST", body: JSON.stringify({ message: "NUMI: provision customer instance", tree: newTree.sha }) });
  await githubFetch(`/repos/${ENV.githubOwner}/${target.name}/git/refs`, { method: "POST", body: JSON.stringify({ ref: "refs/heads/main", sha: commit.sha }) });
  return { owner: ENV.githubOwner, repo: target.name, branch: "main" };
}
