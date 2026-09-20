import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    MONGO_URI: "mongodb://localhost:27017/test",
    JWT_SECRET: "test-jwt-secret-that-is-at-least-32-characters-long",
    SMTP_HOST: undefined,
    SMTP_PORT: 587,
    SMTP_USER: undefined,
    SMTP_PASS: undefined,
    SMTP_FROM: '"Documan Security" <no-reply@documan.app>',
    SMTP_SECURE: false,
  },
}));

import {
  ConsoleEmailService,
  SmtpEmailService,
  emailService,
  setEmailService,
  getEmailService,
} from "./email.service.js";

describe("Email Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should log to console in ConsoleEmailService", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const service = new ConsoleEmailService();

    await service.sendVerificationOtp("user@example.com", "John Doe", "123456");

    expect(consoleSpy).toHaveBeenNthCalledWith(
      2,
      "[DEV OTP EMAIL] To: user@example.com | Name: John Doe | Verification Code: 123456",
    );
  });

  it("should fallback to console log in SmtpEmailService when transporter is not configured", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const service = new SmtpEmailService();

    await service.sendVerificationOtp("user@example.com", "John Doe", "123456");

    expect(consoleSpy).toHaveBeenCalled();
  });

  it("should allow setting a custom active email service", async () => {
    const mockSend = vi.fn().mockResolvedValue(undefined);
    const mockService = { sendVerificationOtp: mockSend };

    const previousService = getEmailService();
    setEmailService(mockService);

    await emailService.sendVerificationOtp("test@example.com", "Tester", "654321");

    expect(mockSend).toHaveBeenCalledWith("test@example.com", "Tester", "654321");

    setEmailService(previousService);
  });
});
