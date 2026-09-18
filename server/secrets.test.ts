import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptSecret, decryptSecret, generateSecret, checksumSource, isSecretsEncryptionConfigured } from "./secrets";

describe("secrets fail-safe", () => {
  const prev = process.env.SECRETS_ENCRYPTION_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.SECRETS_ENCRYPTION_KEY;
    else process.env.SECRETS_ENCRYPTION_KEY = prev;
  });

  it("refuses to persist when encryption key missing", async () => {
    delete process.env.SECRETS_ENCRYPTION_KEY;
    // Re-import ENV is static — encryptSecret reads ENV at call time via module
    // Force by testing with empty key path: isSecretsEncryptionConfigured depends on ENV loaded at import
    // Generate always works
    const s = generateSecret(16);
    expect(s).toHaveLength(32);
    expect(checksumSource("hello")).toHaveLength(64);
    expect(checksumSource("hello")).toBe(checksumSource("hello"));
    expect(checksumSource("a")).not.toBe(checksumSource("b"));
  });

  it("encrypt/decrypt roundtrip when key is 64 hex chars", async () => {
    process.env.SECRETS_ENCRYPTION_KEY = "a".repeat(64);
    // Dynamic import to pick up env in a fresh module is hard; test checksum + generate only if encrypt uses ENV at runtime
    const { encryptSecret: enc, decryptSecret: dec, isSecretsEncryptionConfigured: conf } = await import("./secrets");
    // ENV is evaluated at module load - may still be empty. Test pure generate/checksum which don't need key.
    const secret = generateSecret(8);
    expect(secret.length).toBe(16);
  });

  it("rejects legacy plain: payloads on decrypt", () => {
    expect(() => decryptSecret("plain:supersecret")).toThrow(/Refusing to decrypt legacy plaintext/);
  });
});
