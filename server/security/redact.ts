/**
 * Redact secrets from logs and client-facing errors.
 */
const SECRET_PATTERNS: RegExp[] = [
  /postgres(ql)?:\/\/[^\s"']+/gi,
  /Bearer\s+[A-Za-z0-9._\-]+/gi,
  /sk_(live|test)_[A-Za-z0-9]+/g,
  /ghp_[A-Za-z0-9]+/g,
  /github_pat_[A-Za-z0-9_]+/g,
  /-----BEGIN[^-]+PRIVATE KEY-----[\s\S]*?-----END[^-]+PRIVATE KEY-----/g,
];

const KEY_HINTS = ["password", "secret", "token", "apikey", "api_key", "authorization", "connectionurl", "connection_uri", "databaseurl"];

export function redactString(input: string): string {
  let out = input;
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[REDACTED]");
  return out;
}

export function redactUnknown(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (KEY_HINTS.some((h) => k.toLowerCase().includes(h))) next[k] = "[REDACTED]";
      else next[k] = redactUnknown(v);
    }
    return next;
  }
  return value;
}

export function safeErrorMessage(error: unknown, fallback = "Operation failed"): string {
  if (!(error instanceof Error)) return fallback;
  return redactString(error.message || fallback);
}
