export type HealthResult = {
  ok: boolean;
  status?: number;
  latencyMs: number;
  error?: string;
};

export async function checkHttpHealth(url: string, timeoutMs = 8000): Promise<HealthResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    return { ok: response.ok, status: response.status, latencyMs: Date.now() - started };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : "Health check failed" };
  } finally {
    clearTimeout(timer);
  }
}
