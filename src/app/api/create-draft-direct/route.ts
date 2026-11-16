import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { createDirectGmailDraft } from "@/lib/gmailDraft";
import { getSmtpCredentials } from "@/lib/nodemailer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Server authentication configuration missing." },
      { status: 500 }
    );
  }

  // Check Google credentials
  const { isConfigured, user: smtpUser } = getSmtpCredentials();
  if (!isConfigured) {
    return NextResponse.json(
      {
        error:
          "Gmail n'est pas configuré. Veuillez définir GMAIL_USER et GMAIL_APP_PASSWORD dans vos variables d'environnement.",
      },
      { status: 500 }
    );
  }

  // Verify caller authentication via session cookie
  const cookieRequest = request as Request & {
    cookies?: {
      getAll?: () => { name: string; value: string }[];
    };
  };

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieRequest.cookies?.getAll?.() ?? [];
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in to create drafts." },
      { status: 401 }
    );
  }

  try {
    const payload = await request.json();

    if (!payload.email || typeof payload.email !== "string") {
      return NextResponse.json(
        { error: "Recipient email is required." },
        { status: 400 }
      );
    }

    if (!payload.subject || typeof payload.subject !== "string") {
      return NextResponse.json(
        { error: "Email subject is required." },
        { status: 400 }
      );
    }

    if (!payload.message || typeof payload.message !== "string") {
      return NextResponse.json(
        { error: "Email message content is required." },
        { status: 400 }
      );
    }

    // Direct draft creation via Gmail IMAP
    const draftResult = await createDirectGmailDraft({
      to: payload.email.trim(),
      subject: payload.subject.trim(),
      message: payload.message,
      candidateName: payload.candidateName || user.user_metadata?.full_name || smtpUser,
      cvBase64: payload.cv_base64 || payload.cv_data,
      cvFileName: payload.cv_filename || payload.cv_name,
      coverLetterBase64: payload.cover_letter_base64,
      coverLetterFileName: payload.cover_letter_filename,
      extraAttachmentBase64: payload.extra_attachment_base64 || payload.extraAttachmentBase64,
      extraAttachmentFileName: payload.extra_attachment_filename || payload.extraAttachmentFileName,
      extraAttachments: payload.extra_attachments || payload.extraAttachments,
      replyTo: smtpUser,
    });

    return NextResponse.json({
      success: true,
      messageId: draftResult.messageId,
      mailbox: draftResult.mailbox,
      channel: "direct_draft",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erreur lors de la création directe du brouillon.";
    console.error("[create-draft-direct] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

