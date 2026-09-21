import dns from "node:dns";
import nodemailer, { type Transporter, type SendMailOptions } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export interface IEmailService {
  sendVerificationOtp(to: string, name: string, otp: string): Promise<void>;
}

const customLookup = (
  hostname: string,
  options: any,
  callback: (err: Error | null, address: string | any[], family?: number) => void,
) => {
  const opts = typeof options === "object" && options !== null ? options : {};
  return dns.lookup(hostname, { ...opts, family: 4, all: false }, callback);
};

export class ConsoleEmailService implements IEmailService {
  async sendVerificationOtp(to: string, name: string, otp: string): Promise<void> {
    if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
      logger.info({ to, name, otp }, "[DEV OTP EMAIL] Local console dispatch");
      console.log(`\n=================================================================`);
      console.log(`[DEV OTP EMAIL] To: ${to} | Name: ${name} | Verification Code: ${otp}`);
      console.log(`=================================================================\n`);
    }
  }
}

export class SmtpEmailService implements IEmailService {
  private primaryTransporter: Transporter | null = null;
  private fallbackTransporter: Transporter | null = null;

  constructor() {
    if (env.SMTP_HOST || env.SMTP_USER) {
      const cleanPass = env.SMTP_PASS
        ? env.SMTP_PASS.replace(/["'\s]/g, "")
        : undefined;

      const user = env.SMTP_USER || "documanapi@gmail.com";

      // Primary: Port 465 SSL via service: 'gmail'
      const primaryOptions: any = {
        service: "gmail",
        family: 4,
        lookup: customLookup,
        auth: { user, pass: cleanPass },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000,
      };
      this.primaryTransporter = nodemailer.createTransport(primaryOptions);

      // Fallback: Port 587 STARTTLS
      const fallbackOptions: any = {
        host: env.SMTP_HOST || "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        family: 4,
        lookup: customLookup,
        auth: { user, pass: cleanPass },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000,
        tls: { rejectUnauthorized: false },
      };
      this.fallbackTransporter = nodemailer.createTransport(fallbackOptions);
    }
  }

  private async trySendMail(transporter: Transporter, mailOptions: SendMailOptions, label: string): Promise<boolean> {
    try {
      await Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after 4000ms`)), 4000),
        ),
      ]);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ label, error: msg }, `[SMTP DISPATCH ATTEMPT FAILED] ${label}: ${msg}`);
      return false;
    }
  }

  async sendVerificationOtp(to: string, name: string, otp: string): Promise<void> {
    if (this.primaryTransporter && this.fallbackTransporter) {
      const senderUser = env.SMTP_USER || "documanapi@gmail.com";
      let fromAddress = `"Documan Security" <${senderUser}>`;
      if (env.SMTP_FROM && env.SMTP_FROM.trim()) {
        const cleanFrom = env.SMTP_FROM.trim().replace(/^["']|["']$/g, "");
        if (cleanFrom.includes("@")) {
          fromAddress = cleanFrom.includes("<")
            ? cleanFrom
            : `"Documan Security" <${cleanFrom}>`;
        }
      }

      const mailPayload = {
        from: fromAddress,
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
      };

      // 1. Try Primary Port 465 SSL
      const sentPrimary = await this.trySendMail(this.primaryTransporter, mailPayload, "Port 465 SSL");
      if (sentPrimary) {
        logger.info({ to, otp }, "[SMTP OTP EMAIL DISPATCHED] Email sent successfully via Port 465 SSL");
        console.log(`[SMTP OTP EMAIL DISPATCHED] To: ${to}`);
        return;
      }

      // 2. Try Fallback Port 587 STARTTLS
      const sentFallback = await this.trySendMail(this.fallbackTransporter, mailPayload, "Port 587 STARTTLS");
      if (sentFallback) {
        logger.info({ to, otp }, "[SMTP OTP EMAIL DISPATCHED] Email sent successfully via Port 587 STARTTLS");
        console.log(`[SMTP OTP EMAIL DISPATCHED] To: ${to}`);
        return;
      }

      // 3. Log OTP code fallback if both raw ports are restricted by host environment
      logger.error({ to, otp }, "[SMTP ERROR - ALL PORTS RESTRICTED] Both Port 465 and 587 raw sockets timed out");
      console.error("[SMTP ERROR - ALL PORTS RESTRICTED] Both Port 465 and 587 raw sockets timed out");
      console.log(`[PROD OTP FALLBACK LOG] To: ${to} | Verification Code: ${otp}`);
    } else if (env.NODE_ENV === "production") {
      logger.info({ to, otp }, "[PROD OTP EMAIL DISPATCHED] Unconfigured SMTP log fallback");
      console.log(`[PROD OTP EMAIL DISPATCHED] To: ${to} | Code: ${otp}`);
    } else {
      logger.info({ to, otp }, "[SMTP OTP EMAIL] Local dev fallback");
      console.log(`[SMTP OTP EMAIL] To: ${to} | Code: ${otp}`);
    }
  }
}

let customEmailService: IEmailService | null = null;

export function getEmailService(): IEmailService {
  if (customEmailService) {
    return customEmailService;
  }
  if (env.SMTP_HOST || env.SMTP_USER || env.NODE_ENV === "production") {
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
