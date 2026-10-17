import { NextResponse } from "next/server";
import { resolveLogoForDomain } from "@/lib/tracker/logo-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain") ?? "";
  const quick = searchParams.get("quick") === "1";

  if (!domain.trim()) {
    return NextResponse.json({ logoUrl: null, error: "domain is required" }, { status: 400 });
  }

  const logoUrl = await resolveLogoForDomain(domain, { quickOnly: quick });
  return NextResponse.json({ logoUrl, source: logoUrl ? "resolved" : "none" });
}
