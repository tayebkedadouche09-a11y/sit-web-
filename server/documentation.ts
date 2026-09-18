/**
 * Delivery documentation generator — no secrets in output.
 */
export type DeliveryDocInput = {
  productName: string;
  productSlug: string;
  versionLabel?: string;
  instanceUrl?: string | null;
  sourceRepoUrl?: string | null;
  licenseKey?: string;
  purchaseId: number;
  healthOk?: boolean;
};

export function generateDeliveryDocumentation(input: DeliveryDocInput): {
  markdown: string;
  ready: boolean;
} {
  const lines = [
    `# ${input.productName} — Customer Delivery`,
    ``,
    `Purchase ID: ${input.purchaseId}`,
    `Product: ${input.productSlug}`,
    input.versionLabel ? `Version: ${input.versionLabel}` : null,
    input.instanceUrl ? `Website: ${input.instanceUrl}` : `Website: pending`,
    input.sourceRepoUrl ? `Source: ${input.sourceRepoUrl}` : `Source: pending`,
    input.licenseKey ? `License: ${input.licenseKey}` : null,
    `Health: ${input.healthOk ? "passed" : "pending/failed"}`,
    ``,
    `## Notes`,
    `- This document does not contain secrets or API keys.`,
    `- Master product changes after purchase do not alter this instance.`,
    ``,
  ].filter(Boolean) as string[];

  const ready = Boolean(input.instanceUrl && input.sourceRepoUrl && input.licenseKey && input.healthOk);
  return { markdown: lines.join("\n"), ready };
}
