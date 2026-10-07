import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

type Mail = { to: string; subject: string; text: string };

let transport: Transporter | undefined;

// Sends through the SMTP server in .env (Gmail by default). Without SMTP_HOST the mail goes to the
// server log instead, so signing in still works locally before email is set up.
export async function sendMail({ to, subject, text }: Mail) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`[mail] SMTP_HOST isn't set, so not sending. To: ${to}\n${subject}\n${text}`);
    return;
  }
  const port = Number(process.env.SMTP_PORT) || 465;
  transport ??= nodemailer.createTransport({
    host,
    port,
    // 465 speaks TLS from the start; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
}
