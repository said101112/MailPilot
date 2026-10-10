export type EmailValidationCode =
  | "empty"
  | "invalid_format"
  | "missing_domain"
  | "domain_not_found"
  | "no_mx"
  | "risky_fallback"
  | "valid";

export type EmailValidationResult = {
  valid: boolean;
  code: EmailValidationCode;
  message: string;
  domain?: string;
};

const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function extractEmailDomain(value: string) {
  const normalized = normalizeEmail(value);
  const [, domain = ""] = normalized.split("@");
  return domain;
}

export function validateEmailFormat(value: string): EmailValidationResult {
  const normalized = normalizeEmail(value);

  if (!normalized) {
    return {
      valid: false,
      code: "empty",
      message: "Email is required before sending.",
    };
  }

  if (!normalized.includes("@")) {
    return {
      valid: false,
      code: "missing_domain",
      message: "Add a full email address with a domain.",
    };
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    return {
      valid: false,
      code: "invalid_format",
      message: "Email format looks invalid.",
    };
  }

  return {
    valid: true,
    code: "valid",
    message: "Email format looks valid.",
    domain: extractEmailDomain(normalized),
  };
}
