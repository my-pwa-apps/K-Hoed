import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signJwt, verifyJwt, extractBearerToken } from "../../src/lib/auth";

const TEST_SECRET = "test-secret-key-at-least-32-chars-long!!";

describe("hashPassword / verifyPassword", () => {
  it("produces a hash string with two hex segments (salt:hash)", async () => {
    const hash = await hashPassword("mypassword");
    expect(hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-password");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces different hashes for the same password (unique salts)", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
  });
});

describe("signJwt / verifyJwt", () => {
  it("signs and verifies a token", async () => {
    const token = await signJwt(
      { sub: "user123", email: "test@example.com", display_name: "Test" },
      TEST_SECRET,
    );
    expect(typeof token).toBe("string");

    const payload = await verifyJwt(token, TEST_SECRET);
    expect(payload?.sub).toBe("user123");
    expect(payload?.email).toBe("test@example.com");
  });

  it("returns null for a tampered token", async () => {
    const token = await signJwt({ sub: "x", email: "e", display_name: "n" }, TEST_SECRET);
    const tampered = token.slice(0, -4) + "XXXX";
    expect(await verifyJwt(tampered, TEST_SECRET)).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    const token = await signJwt({ sub: "x", email: "e", display_name: "n" }, TEST_SECRET);
    expect(await verifyJwt(token, "completely-different-secret-string")).toBeNull();
  });

  it("returns null for garbage input", async () => {
    expect(await verifyJwt("not.a.jwt", TEST_SECRET)).toBeNull();
  });
});

describe("extractBearerToken", () => {
  it("extracts token from valid Authorization header", () => {
    expect(extractBearerToken("Bearer my-token")).toBe("my-token");
  });

  it("returns null when header is missing", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null when scheme is wrong", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
  });

  it("returns null for empty token", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
  });
});
