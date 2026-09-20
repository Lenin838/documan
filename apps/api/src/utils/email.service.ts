import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";

export interface IEmailService {
  sendVerificationOtp(to: string, name: string, otp: string): Promise<void>;
}

export class ConsoleEmailService implements IEmailService {
  async sendVerificationOtp(to: string, name: string, otp: string): Promise<void> {
    if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
      console.log(`\n=================================================================`);
      console.log(`[DEV OTP EMAIL] To: ${to} | Name: ${name} | Verification Code: ${otp}`);
      console.log(`[NOTE] SMTP_HOST is not set in .env. Email was NOT sent over network.`);
      console.log(`[NOTE] To send real inbox emails, configure SMTP_HOST, SMTP_USER, etc.`);
      console.log(`=================================================================\n`);
    }
  }
}

export class SmtpEmailService implements IEmailService {
  private transporter: Transporter | null = null;

  constructor() {
    if (env.SMTP_HOST) {
      const cleanPass = env.SMTP_PASS
        ? env.SMTP_PASS.replace(/["'\s]/g, "")
        : undefined;

      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        auth: env.SMTP_USER
          ? {
              user: env.SMTP_USER,
              pass: cleanPass,
            }
          : undefined,
      });
    }
  }

  async sendVerificationOtp(to: string, name: string, otp: string): Promise<void> {
    if (this.transporter) {
      try {
        await Promise.race([
          this.transporter.sendMail({
            from: env.SMTP_FROM,
            to,
            subject: `${otp} is your Documan Verification Code`,
            text: `Hello ${name},\n\nYour Documan email verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this code, please ignore this email.\n\nBest regards,\nDocuman Security Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
                <h2 style="color: #1e293b; margin-top: 0;">Email Verification Code</h2>
                <p style="color: #475569; line-height: 1.5;">Hello <strong>${name}</strong>,</p>
                <p style="color: #475569; line-height: 1.5;">Thank you for registering with Documan. Please enter the following 6-digit verification code to complete your signup:</p>
                <div style="background-color: #f1f5f9; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">${otp}</span>
                </div>
                <p style="color: #64748b; font-size: 14px;">This code is valid for 10 minutes. If you did not request this email, please ignore it.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Documan Enterprise Document Management & Governance</p>
              </div>
            `,
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("SMTP sendMail timed out after 10000ms")),
              10000,
            ),
          ),
        ]);
        console.log(`[SMTP OTP EMAIL DISPATCHED] To: ${to}`);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[SMTP ERROR - DISPATCH FAILED] ${errorMsg}`);
        throw err;
      }
    } else if (env.NODE_ENV === "production") {
      console.log(`[PROD OTP EMAIL DISPATCHED] To: ${to} | Code: ${otp}`);
    } else {
      console.log(`[SMTP OTP EMAIL] To: ${to} | Code: ${otp}`);
    }
  }
}

let customEmailService: IEmailService | null = null;

export function getEmailService(): IEmailService {
  if (customEmailService) {
    return customEmailService;
  }
  if (env.SMTP_HOST || env.NODE_ENV === "production") {
    return new SmtpEmailService();
  }
  return new ConsoleEmailService();
}

export function setEmailService(service: IEmailService): void {
  customEmailService = service;
}

export const emailService = {
  sendVerificationOtp: (to: string, name: string, otp: string) =>
    getEmailService().sendVerificationOtp(to, name, otp),
};
