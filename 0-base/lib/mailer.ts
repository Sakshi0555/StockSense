import nodemailer from "nodemailer";

export class MailError extends Error {}

// Sends the password-reset OTP to the user's inbox via SMTP (Gmail by default).
export async function sendOtpEmail(to: string, otp: string) {
  const { SMTP_HOST = "smtp.gmail.com", SMTP_PORT = "587", SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    throw new MailError("Email service is not configured. Set SMTP_USER and SMTP_PASS in .env.");
  }
  const port = Number(SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  try {
    await transporter.sendMail({
      from: `StockSense <${SMTP_USER}>`,
      to,
      subject: `${otp} is your StockSense password reset code`,
      text: `Your StockSense password reset code is ${otp}.\n\nIt expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <h2 style="color:#e11d48;margin:0 0 12px">StockSense</h2>
        <p>Use this code to reset your password:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:16px 0">${otp}</p>
        <p style="color:#666;font-size:13px">It expires in 10 minutes. If you did not request this, you can ignore this email.</p>
      </div>`,
    });
  } catch (e) {
    console.error("[StockSense] Failed to send OTP email:", e);
    throw new MailError("Could not send the OTP email. Check the SMTP settings and try again.");
  }
}
