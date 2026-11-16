import tls from "tls";
import nodemailer, { type SendMailOptions } from "nodemailer";
import { formatEmailToHtml, stripEmailFormatting } from "./emailPersonalizer";
import { getSmtpCredentials, type DirectMailPayload } from "./nodemailer";

export interface DirectDraftResult {
  success: boolean;
  mailbox: string;
  messageId?: string;
  channel: "direct_draft";
}

/**
 * Converts HTML/formatted text into clean plain text for multipart/alternative
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
 * Builds a full RFC822 MIME message buffer using Nodemailer's built-in stream transport
 */
async function buildRfc822Message(
  payload: DirectMailPayload,
  user: string
): Promise<{ buffer: Buffer; messageId?: string }> {
  const dummyTransporter = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: "windows",
  });

  const formattedName = payload.candidateName?.trim() || "Candidat";
  const fromHeader = `"${formattedName}" <${user}>`;

  // Attachments
  const attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }> = [];

  if (payload.cvBase64) {
    const cleanBase64 = payload.cvBase64.replace(/^data:[^;]+;base64,/, "").trim();
    attachments.push({
      filename: payload.cvFileName || "CV.pdf",
      content: Buffer.from(cleanBase64, "base64"),
      contentType: "application/pdf",
    });
  }

  if (payload.coverLetterBase64) {
    const cleanBase64 = payload.coverLetterBase64.replace(/^data:[^;]+;base64,/, "").trim();
    attachments.push({
      filename: payload.coverLetterFileName || "Lettre_de_motivation.pdf",
      content: Buffer.from(cleanBase64, "base64"),
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
      "X-Mailer": "MailPilot-DirectDraft",
    },
  };

  const info = await dummyTransporter.sendMail(mailOptions);
  return {
    buffer: info.message as Buffer,
    messageId: info.messageId,
  };
}

/**
 * Connects to Gmail via IMAP (SSL port 993) using the Google App Password,
 * discovers the Drafts folder (e.g. "[Gmail]/Drafts" or "[Gmail]/Brouillons"),
 * and appends the email with (\Draft \Seen) flags so it appears natively in Gmail Drafts.
 */
function appendMessageToGmailImap(
  user: string,
  pass: string,
  messageBuffer: Buffer,
  timeoutMs = 15000
): Promise<{ success: boolean; mailbox: string }> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const cleanup = () => {
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {
        // ignore
      }
    };

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error("Délai d'attente IMAP dépassé (15s). Vérifiez votre connexion."));
      }
    }, timeoutMs);

    const socket = tls.connect(
      {
        host: "imap.gmail.com",
        port: 993,
        servername: "imap.gmail.com",
      },
      () => {
        // Connected
      }
    );

    let tagCount = 0;
    function sendCommand(cmd: string): string {
      tagCount++;
      const tag = `M${tagCount}`;
      socket.write(`${tag} ${cmd}\r\n`);
      return tag;
    }

    let state: "INIT" | "LOGIN" | "LIST" | "APPEND_WAIT_CONT" | "APPEND_WAIT_OK" | "LOGOUT" =
      "INIT";
    let currentTag = "";
    let detectedDraftsFolder = "[Gmail]/Drafts";
    let rawBuffer = "";

    socket.on("data", (chunk: Buffer) => {
      if (state === "APPEND_WAIT_CONT") {
        const text = chunk.toString("utf8");
        if (text.includes("+")) {
          state = "APPEND_WAIT_OK";
          // Send literal RFC822 message bytes followed by CRLF
          socket.write(messageBuffer);
          socket.write("\r\n");
          return;
        }
      }

      rawBuffer += chunk.toString("utf8");
      const lines = rawBuffer.split("\r\n");
      rawBuffer = lines.pop() ?? "";

      for (const line of lines) {
        if (state === "INIT" && line.startsWith("* OK")) {
          state = "LOGIN";
          // Escaping double quotes & backslashes for IMAP astring
          const safeUser = user.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          const safePass = pass.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          currentTag = sendCommand(`LOGIN "${safeUser}" "${safePass}"`);
        } else if (state === "LOGIN" && line.startsWith(currentTag)) {
          if (line.includes("OK")) {
            state = "LIST";
            currentTag = sendCommand('LIST "" "*"');
          } else {
            resolved = true;
            cleanup();
            const errMsg = line.includes("NO")
              ? "Échec d'authentification Gmail. Vérifiez votre mot de passe d'application Google."
              : `Erreur IMAP LOGIN: ${line}`;
            return reject(new Error(errMsg));
          }
        } else if (state === "LIST") {
          // Detect Drafts mailbox by \Drafts attribute or standard names
          if (line.includes("\\Drafts") || line.includes("\\Brouillons")) {
            const match = line.match(/"([^"]+)"$/) || line.match(/\s+([^\s]+)$/);
            if (match?.[1]) {
              detectedDraftsFolder = match[1];
            }
          }
          if (line.startsWith(currentTag)) {
            if (line.includes("OK")) {
              state = "APPEND_WAIT_CONT";
              const safeFolder = detectedDraftsFolder
                .replace(/\\/g, "\\\\")
                .replace(/"/g, '\\"');
              currentTag = sendCommand(
                `APPEND "${safeFolder}" (\\Draft \\Seen) {${messageBuffer.length}}`
              );
            } else {
              // If LIST fails, fallback to standard [Gmail]/Drafts
              state = "APPEND_WAIT_CONT";
              currentTag = sendCommand(
                `APPEND "[Gmail]/Drafts" (\\Draft \\Seen) {${messageBuffer.length}}`
              );
            }
          }
        } else if (state === "APPEND_WAIT_OK" && line.startsWith(currentTag)) {
          if (line.includes("OK")) {
            state = "LOGOUT";
            sendCommand("LOGOUT");
            resolved = true;
            cleanup();
            return resolve({
              success: true,
              mailbox: detectedDraftsFolder,
            });
          } else {
            resolved = true;
            cleanup();
            return reject(
              new Error(
                `Impossible d'ajouter le brouillon dans ${detectedDraftsFolder}: ${line}`
              )
            );
          }
        }
      }
    });

    socket.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error(`Erreur de connexion IMAP avec Gmail: ${err.message}`));
      }
    });

    socket.on("end", () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error("Connexion IMAP fermée prématurément par Gmail."));
      }
    });
  });
}

/**
 * Public entrypoint: creates a draft directly in the user's Gmail Drafts folder
 * using their existing GMAIL_USER and GMAIL_APP_PASSWORD credentials without n8n.
 */
export async function createDirectGmailDraft(
  payload: DirectMailPayload
): Promise<DirectDraftResult> {
  const { user, pass, isConfigured } = getSmtpCredentials();

  if (!isConfigured) {
    throw new Error(
      "Identifiants Gmail non configurés. Veuillez définir GMAIL_USER et GMAIL_APP_PASSWORD dans vos paramètres / variables d'environnement."
    );
  }

  // 1. Compile the full RFC822 MIME message (with CV, cover letter, HTML, headers)
  const { buffer, messageId } = await buildRfc822Message(payload, user);

  // 2. Append directly to Gmail Drafts folder via IMAP
  const imapResult = await appendMessageToGmailImap(user, pass, buffer);

  return {
    success: true,
    mailbox: imapResult.mailbox,
    messageId,
    channel: "direct_draft",
  };
}

