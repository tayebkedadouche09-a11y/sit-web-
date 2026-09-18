import { randomUUID } from "node:crypto";

export type AutomationJob = {
  id: string;
  kind: string;
  correlationId: string;
  attempt: number;
  maxAttempts: number;
  state: "queued" | "running" | "succeeded" | "failed" | "blocked";
};

export function createAutomationJob(kind: string, correlationId = randomUUID(), maxAttempts = 3): AutomationJob {
  return { id: randomUUID(), kind, correlationId, attempt: 0, maxAttempts: Math.max(1, maxAttempts), state: "queued" };
}

export function nextRetry(job: AutomationJob): AutomationJob {
  const attempt = job.attempt + 1;
  if (attempt >= job.maxAttempts) return { ...job, attempt, state: "failed" };
  return { ...job, attempt, state: "queued" };
}
