import nodemailer, { type SendMailOptions } from "nodemailer";
import { formatEmailToHtml, stripEmailFormatting } from "./emailPersonalizer";

export interface DirectMailPayload {
  to: string;
  subject: string;
  message: string;
  candidateName?: string;
  cvBase64?: string;
  cvFileName?: string;
  coverLetterBase64?: string;
  coverLetterFileName?: string;
  replyTo?: string;
}

export interface SmtpConfigStatus {
  configured: boolean;
  user: string | null;
  healthy: boolean | null;
  message: string;
}

/**
 * Normalizes a Google App Password (removes all spaces)
 */
export function cleanGoogleAppPassword(password: string): string {
  return password.replace(/\s+/g, "").trim();
}

/**
 * Returns SMTP credentials from environment variables
 */
export function getSmtpCredentials() {
  const user = (process.env.GMAIL_USER || process.env.SMTP_GMAIL_USER || "").trim();
  const rawPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_GMAIL_APP_PASSWORD || "").trim();
  const pass = cleanGoogleAppPassword(rawPass);

  return {
    user,
    pass,
    isConfigured: Boolean(user && pass),
  };
}

/**
 * Creates a standard Nodemailer transporter connecting directly to Gmail SMTP (SSL 465)
 */
export function createGmailTransporter() {
  const { user, pass, isConfigured } = getSmtpCredentials();

  if (!isConfigured) {
    throw new Error(
      "Gmail SMTP non configuré. Veuillez définir GMAIL_USER et GMAIL_APP_PASSWORD dans vos variables d'environnement."
    );
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL
    auth: {
      user,
      pass,
    },
    // Reasonable timeouts to avoid hanging on Serverless / Vercel
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
  });
}

/**
 * Verifies that the SMTP credentials are valid and can authenticate
 */
export async function verifySmtpConnection(): Promise<SmtpConfigStatus> {
  const { user, isConfigured } = getSmtpCredentials();

  if (!isConfigured) {
    return {
      configured: false,
      user: user || null,
      healthy: false,
      message: "GMAIL_USER ou GMAIL_APP_PASSWORD manquant dans les variables d'environnement.",
    };
  }

  try {
    const transporter = createGmailTransporter();
    await transporter.verify();
    return {
      configured: true,
      user,
      healthy: true,
      message: `Authentification Gmail SMTP réussie pour ${user}.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
    return {
      configured: true,
      user,
      healthy: false,
      message: `Échec d'authentification SMTP: ${errorMsg}`,
    };
  }
}

/**
 * Converts HTML/formatted text into clean plain text for multipart/alternative (prevents SPAM)
 */
function convertToPlainText(htmlOrText: string): string {
  return stripEmailFormatting(htmlOrText)
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

/**
 * Sends an email directly via Gmail SMTP using official Google credentials
 */
export async function sendDirectEmail(payload: DirectMailPayload) {
  const { user } = getSmtpCredentials();
  const transporter = createGmailTransporter();

  const formattedName = payload.candidateName?.trim() || "Candidat";
  const fromHeader = `"${formattedName}" <${user}>`;

  // Prepare attachments (CV + Cover Letter)
  const attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }> = [];

  if (payload.cvBase64) {
    // Strip data URI prefix if present (e.g. data:application/pdf;base64,...)
    const cleanBase64 = payload.cvBase64.replace(/^data:[^;]+;base64,/, "").trim();
    const buffer = Buffer.from(cleanBase64, "base64");
    attachments.push({
      filename: payload.cvFileName || "CV.pdf",
      content: buffer,
      contentType: "application/pdf",
    });
  }

  if (payload.coverLetterBase64) {
    const cleanBase64 = payload.coverLetterBase64.replace(/^data:[^;]+;base64,/, "").trim();
    const buffer = Buffer.from(cleanBase64, "base64");
    attachments.push({
      filename: payload.coverLetterFileName || "Lettre_de_motivation.pdf",
      content: buffer,
      contentType: "application/pdf",
    });
  }

  const plainText = convertToPlainText(payload.message);
  const htmlBody = formatEmailToHtml(payload.message);

  const mailOptions: SendMailOptions = {
    from: fromHeader,
    to: payload.to,
    replyTo: payload.replyTo || user,
    subject: stripEmailFormatting(payload.subject),
    text: plainText,
    html: `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937;">${htmlBody}</body></html>`,
    attachments,
    headers: {
      "X-Mailer": "MailPilot-DirectSend",
    },
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}

