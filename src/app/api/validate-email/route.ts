import { promises as dns } from "node:dns";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { extractEmailDomain, validateEmailFormat } from "@/lib/email";

export const runtime = "nodejs";

type ValidateEmailBody = {
  email?: string;
};

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (supabaseUrl && supabaseAnonKey) {
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
        { valid: false, code: "unauthorized", message: "Authentication required." },
        { status: 401 }
      );
    }
  }

  const body = (await request.json()) as ValidateEmailBody;
  const email = body.email?.trim() ?? "";
  const formatCheck = validateEmailFormat(email);

  if (!formatCheck.valid) {
    return NextResponse.json(formatCheck, { status: 200 });
  }

  const domain = extractEmailDomain(email);

  try {
    const mxRecords = await dns.resolveMx(domain);

    if (mxRecords.length === 0) {
      return NextResponse.json({
        valid: false,
        code: "no_mx",
        message: "The email domain does not advertise a mail server.",
        domain,
      });
    }

    return NextResponse.json({
      valid: true,
      code: "valid",
      message: "Mail domain looks valid and reachable.",
      domain,
      mxCount: mxRecords.length,
    });
  } catch (error) {
    try {
      const [ipv4, ipv6] = await Promise.allSettled([
        dns.resolve4(domain),
        dns.resolve6(domain),
      ]);

      const hasAddress =
        (ipv4.status === "fulfilled" && ipv4.value.length > 0) ||
        (ipv6.status === "fulfilled" && ipv6.value.length > 0);

      if (hasAddress) {
        return NextResponse.json({
          valid: false,
          code: "risky_fallback",
          message:
            "The domain resolves, but no MX record was found. Delivery is risky.",
          domain,
        });
      }
    } catch {
      // Keep the DNS error result below.
    }

    const message =
      error instanceof Error ? error.message : "The email domain could not be verified.";

    return NextResponse.json({
      valid: false,
      code: "domain_not_found",
      message,
      domain,
    });
  }
}
