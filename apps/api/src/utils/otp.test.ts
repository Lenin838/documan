import { describe, expect, it } from "vitest";
import { generateOtp, hashOtp, verifyOtpHash } from "./otp.js";

describe("OTP Utilities", () => {
  it("should generate a 6-digit numeric string", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
    expect(otp.length).toBe(6);
  });

  it("should compute deterministic SHA-256 hash", () => {
    const otp = "123456";
    const hash1 = hashOtp(otp);
    const hash2 = hashOtp(otp);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });

  it("should correctly verify matching OTP hash using timingSafeEqual", () => {
    const otp = "654321";
    const hash = hashOtp(otp);

    expect(verifyOtpHash("654321", hash)).toBe(true);
    expect(verifyOtpHash("000000", hash)).toBe(false);
  });
});
