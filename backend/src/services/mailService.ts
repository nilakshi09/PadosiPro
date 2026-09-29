/**
 * mailService.ts — Email sending via Nodemailer.
 *
 * WHY: Centralises all email sending so routes/services never
 * touch SMTP directly. In production, swap SMTP_HOST/SMTP_PORT
 * for a real provider (e.g. SendGrid, AWS SES, Postmark).
 * For local dev, we point at Mailpit which catches every email
 * and shows it in a nice UI at http://localhost:8025.
 */

import nodemailer from "nodemailer";
import { env } from "../config/env";

// ── SMTP Transporter ────────────────────────────────────────────
// In production, you'd add auth: { user, pass } and set secure: true.
// Mailpit needs neither authentication nor TLS.
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,         // Mailpit doesn't use TLS
  // No auth block — Mailpit accepts everything without credentials
});

/**
 * Send a verification OTP email with friendly PadosiPro branding.
 *
 * NOTE: The plain OTP code is shown ONLY in the email body.
 * It is NEVER logged, returned in API responses, or stored in plaintext.
 *
 * @param to   - Recipient email address
 * @param code - The plain 6-digit OTP code (will only appear in the email)
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: `"PadosiPro" <${env.MAIL_FROM}>`,
    to,
    subject: "Your PadosiPro verification code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #2563eb; margin-bottom: 8px;">👋 Welcome to PadosiPro!</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.5;">
          Use the code below to verify your email address.
          It expires in <strong>${env.OTP_TTL_MINUTES} minutes</strong>.
        </p>
        <div style="
          background: #f0f4ff;
          border: 2px dashed #2563eb;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 24px 0;
        ">
          <span style="
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #1e40af;
          ">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't sign up for PadosiPro, just ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          PadosiPro — Your neighbourhood, connected.
        </p>
      </div>
    `,
  });
}
