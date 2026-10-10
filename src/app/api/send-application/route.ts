import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const webhookUrl =
    process.env.N8N_WEBHOOK_URL?.trim() ||
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Server authentication configuration missing." },
      { status: 500 }
    );
  }

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "N8N_WEBHOOK_URL is not configured on the server." },
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
      { error: "Unauthorized: You must be logged in to send applications." },
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

    // Call n8n webhook from server-side
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        userId: user.id,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
        source: "mailpilot-backend",
      }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      return NextResponse.json(
        {
          success: false,
          error: `n8n webhook error (${n8nResponse.status}): ${errorText || n8nResponse.statusText}`,
        },
        { status: n8nResponse.status }
      );
    }

    const rawText = await n8nResponse.text();
    let body: unknown = { success: true };

    if (rawText && rawText.trim().length > 0) {
      try {
        body = JSON.parse(rawText);
      } catch {
        body = { message: rawText };
      }
    }

    return NextResponse.json({
      success: true,
      data: body,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to execute outreach workflow.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
