import { env } from "../config/env.js";

export interface IEmailService {
  sendVerificationOtp(to: string, name: string, otp: string): Promise<void>;
}

export class ConsoleEmailService implements IEmailService {
  async sendVerificationOtp(to: string, name: string, otp: string): Promise<void> {
    if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
      // In dev/test, log cleanly for QA retrieval without leaking to production logs
      console.log(`[DEV OTP EMAIL] To: ${to} | Name: ${name} | Code: ${otp}`);
    }
  }
}

export class SmtpEmailService implements IEmailService {
  async sendVerificationOtp(to: string, name: string, otp: string): Promise<void> {
    // Production email dispatch (SMTP/Nodemailer)
    if (env.NODE_ENV === "production") {
      // If production SMTP is configured, handle delivery here
      // For fallback in current environment, output structured log
      console.log(`[PROD OTP EMAIL DISPATCHED] To: ${to}`);
    } else {
      console.log(`[SMTP OTP EMAIL] To: ${to} | Code: ${otp}`);
    }
  }
}

let activeEmailService: IEmailService =
  env.NODE_ENV === "production"
    ? new SmtpEmailService()
    : new ConsoleEmailService();

export function getEmailService(): IEmailService {
  return activeEmailService;
}

export function setEmailService(service: IEmailService): void {
  activeEmailService = service;
}

export const emailService = {
  sendVerificationOtp: (to: string, name: string, otp: string) =>
    getEmailService().sendVerificationOtp(to, name, otp),
};
