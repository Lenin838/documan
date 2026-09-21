import dns from "node:dns";
import nodemailer, { type Transporter } from "nodemailer";
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
  private transporter: Transporter | null = null;

  constructor() {
    if (env.SMTP_HOST || env.SMTP_USER) {
      const cleanPass = env.SMTP_PASS
        ? env.SMTP_PASS.replace(/["'\s]/g, "")
        : undefined;

      const isGmail =
        (env.SMTP_HOST && env.SMTP_HOST.includes("gmail")) ||
        (env.SMTP_USER && env.SMTP_USER.includes("gmail"));

      const host = env.SMTP_HOST || "smtp.gmail.com";
      const port = env.SMTP_PORT || (isGmail ? 465 : 587);
      const secure = env.SMTP_SECURE !== undefined ? env.SMTP_SECURE : (port === 465 || isGmail);

      const transportConfig: any = {
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        host,
        port,
        secure,
        family: 4,
        lookup: customLookup,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
        auth: env.SMTP_USER
          ? {
              user: env.SMTP_USER,
              pass: cleanPass,
            }
          : undefined,
        tls: {
          rejectUnauthorized: false,
          minVersion: "TLSv1.2",
        },
      };

      this.transporter = nodemailer.createTransport(transportConfig);
    }
  }

  async sendVerificationOtp(to: string, name: string, otp: string): Promise<void> {
    if (this.transporter) {
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

      try {
        await Promise.race([
          this.transporter.sendMail({
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
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("SMTP sendMail timed out after 15000ms")),
              15000,
            ),
          ),
        ]);
        logger.info({ to, otp }, "[SMTP OTP EMAIL DISPATCHED] Email sent successfully over network");
        console.log(`[SMTP OTP EMAIL DISPATCHED] To: ${to}`);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ to, otp, error: errorMsg }, "[SMTP ERROR - DISPATCH FAILED] SMTP email dispatch error");
        console.error(`[SMTP ERROR - DISPATCH FAILED] ${errorMsg}`);
        console.log(`[PROD OTP FALLBACK LOG] To: ${to} | Verification Code: ${otp}`);
      }
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
