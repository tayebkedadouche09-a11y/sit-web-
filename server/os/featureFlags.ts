export type FeatureFlag = {
  key: string;
  enabled: boolean;
  environments?: string[];
  rolloutPercent?: number;
};

export function isFeatureEnabled(flag: FeatureFlag, environment: string, subjectId = "") {
  if (!flag.enabled) return false;
  if (flag.environments?.length && !flag.environments.includes(environment)) return false;
  const percent = Math.max(0, Math.min(100, flag.rolloutPercent ?? 100));
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  let hash = 0;
  for (const char of `${flag.key}:${subjectId}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 100 < percent;
}
