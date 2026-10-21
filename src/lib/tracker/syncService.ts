import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";
import { ensureCompanyLogo } from "./queries";
import type { CompanyRow, ContactRow, JobApplicationRow } from "./types";
import { resolveCountryCategory } from "./countries";

const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.fr",
  "hotmail.com",
  "hotmail.fr",
  "outlook.com",
  "outlook.fr",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "orange.fr",
  "free.fr",
  "wanadoo.fr",
]);

/**
 * Infer human-friendly Contact Full Name and Role from email and optional company name
 */
export function parseContactFromEmail(
  email: string,
  companyName?: string | null
): { fullName: string; role: string } {
  const cleanEmail = email.trim().toLowerCase();
  const [localPart] = cleanEmail.split("@");
  if (!localPart) {
    return { fullName: "Contact", role: "Contact Entreprise" };
  }

  const cleanLocal = localPart.replace(/[0-9]+$/g, "");
  const comp = companyName?.trim() || "";

  // Common corporate role prefixes
  if (cleanLocal.startsWith("drh")) {
    return {
      fullName: comp ? `Direction RH ${comp}` : "Directeur des Ressources Humaines",
      role: "Directeur Ressources Humaines",
    };
  }
  if (cleanLocal.startsWith("recrutement") || cleanLocal.startsWith("recruitment")) {
    return {
      fullName: comp ? `Recrutement ${comp}` : "Équipe Recrutement",
      role: "Recruteur / Talent Acquisition",
    };
  }
  if (cleanLocal.startsWith("rh") || cleanLocal.startsWith("hr")) {
    return {
      fullName: comp ? `Ressources Humaines ${comp}` : "Ressources Humaines",
      role: "Responsable RH",
    };
  }
  if (cleanLocal.startsWith("jobs") || cleanLocal.startsWith("careers")) {
    return {
      fullName: comp ? `Talent Team ${comp}` : "Talent Acquisition",
      role: "Talent Acquisition",
    };
  }
  if (cleanLocal.startsWith("contact") || cleanLocal.startsWith("info")) {
    return {
      fullName: comp ? `Contact ${comp}` : "Contact Général",
      role: "Contact Entreprise",
    };
  }

  // Check for firstname.lastname or firstname_lastname
  const parts = cleanLocal.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    const formatted = parts
      .map((p) => {
        if (p.length === 1) return `${p.toUpperCase()}.`;
        return p.charAt(0).toUpperCase() + p.slice(1);
      })
      .join(" ");

    return {
      fullName: formatted,
      role: "Recruteur / Contact Recrutement",
    };
  }

  // Single word: e.g. "lahlou" or "mohamed"
  if (parts.length === 1 && parts[0].length > 1) {
    const single = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return {
      fullName: single,
      role: "Contact Recrutement",
    };
  }

  return {
    fullName: comp ? `Contact ${comp}` : "Contact Entreprise",
    role: "Contact Entreprise",
  };
}

/**
 * Infer company name and domain from recipient email address
 */
export function inferCompanyFromEmail(email: string): {
  name: string;
  domain: string;
  website: string;
} | null {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length < 2) return null;
  const domain = parts[1];

  if (PUBLIC_EMAIL_DOMAINS.has(domain)) return null;

  // e.g. "talentmind.ma" -> "talentmind", "btpconsulting.ma" -> "btpconsulting"
  const domainParts = domain.split(".");
  const root = domainParts[0] || "";
  if (!root || root.length < 2) return null;

  const formattedName = root.charAt(0).toUpperCase() + root.slice(1);
  return {
    name: formattedName,
    domain: domain,
    website: `https://${domain}`,
  };
}

export interface SyncEmailApplicationParams {
  id?: string;
  company?: string | null;
  email: string;
  position?: string | null;
  created_at?: string;
  status?: string;
}

export interface SyncResult {
  companyId: string;
  companyName: string;
  contactId: string;
  contactName: string;
  applicationId: string;
  isNewCompany: boolean;
  isNewContact: boolean;
  isNewApplication: boolean;
}

/**
 * Links an email dispatch record to the Tracker:
 * 1. Checks if the company exists by name or domain. If not, creates it.
 * 2. Checks if the contact exists by email. If not, creates it and links to the company.
 * 3. Checks if the job_application exists. If not, creates it linked to company & contact.
 */
export async function syncEmailDispatchToTracker(
  item: SyncEmailApplicationParams
): Promise<SyncResult> {
  const userId = await getAuthUserId();
  const email = item.email.trim().toLowerCase();

  // 1. Resolve Company Name & Domain
  let compName = (item.company || "").trim();
  const inferred = inferCompanyFromEmail(email);

  if (!compName || compName.toLowerCase() === "direct apply" || compName.toLowerCase() === "carrier application") {
    if (inferred) {
      compName = inferred.name;
    } else {
      compName = "Candidature Directe";
    }
  }

  const domain = inferred?.domain || null;
  const website = inferred?.website || null;

  // Search if company already exists
  let targetCompany: CompanyRow | null = null;
  const { data: companiesByName } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", compName)
    .limit(1);

  if (companiesByName && companiesByName.length > 0) {
    targetCompany = companiesByName[0];
  } else if (domain) {
    const { data: companiesByDomain } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", userId)
      .ilike("domain", domain)
      .limit(1);

    if (companiesByDomain && companiesByDomain.length > 0) {
      targetCompany = companiesByDomain[0];
    }
  }
 
   const detectedCountry = resolveCountryCategory(null, domain || email);
   const detectedLocation =
     detectedCountry === "saudi"
       ? "Arabie Saoudite"
       : detectedCountry === "morocco"
       ? "Maroc"
       : detectedCountry === "france"
       ? "France"
       : null;

   if (targetCompany && !targetCompany.location && detectedLocation) {
     try {
       await supabase
         .from("companies")
         .update({ location: detectedLocation })
         .eq("id", targetCompany.id);
       targetCompany.location = detectedLocation;
     } catch {
       // non-blocking
     }
   }

   let isNewCompany = false;
   if (!targetCompany) {
     // Create new company
     const logoUrl = await ensureCompanyLogo(null, domain, website);
     const { data: createdComp, error: compErr } = await supabase
       .from("companies")
       .insert({
         user_id: userId,
         name: compName,
         domain: domain,
         website: website,
         logo_url: logoUrl || null,
         sector: "Technologie & Services",
         location: detectedLocation,
       })
       .select()
       .single();

    if (compErr) {
      throw new Error(`Unable to create company "${compName}": ${compErr.message}`);
    }
    targetCompany = createdComp as CompanyRow;
    isNewCompany = true;
  }

  // 2. Resolve Contact
  let targetContact: ContactRow | null = null;
  const { data: contactsByEmail } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .ilike("email", email)
    .limit(1);

  let isNewContact = false;
  if (contactsByEmail && contactsByEmail.length > 0 && contactsByEmail[0]) {
    const existingContact = contactsByEmail[0] as ContactRow;
    targetContact = existingContact;
    // If contact is not yet linked to this company, link it!
    if (!existingContact.company_id && targetCompany.id) {
      await supabase
        .from("contacts")
        .update({ company_id: targetCompany.id })
        .eq("id", existingContact.id);
      targetContact.company_id = targetCompany.id;
    }
  } else {
    // Infer name and role from email
    const { fullName, role } = parseContactFromEmail(email, compName);
    const { data: createdContact, error: contactErr } = await supabase
      .from("contacts")
      .insert({
        user_id: userId,
        company_id: targetCompany.id,
        full_name: fullName,
        email: email,
        role: role,
        next_action: "Suivre l'email de candidature envoyé",
      })
      .select()
      .single();

    if (contactErr || !createdContact) {
      throw new Error(`Unable to create contact for "${email}": ${contactErr?.message || "Unknown error"}`);
    }
    targetContact = createdContact as ContactRow;
    isNewContact = true;
  }

  if (!targetContact) {
    throw new Error(`Unable to resolve contact for "${email}"`);
  }

  // 3. Resolve Job Application in Tracker
  const position = (item.position || "Stage PFE / Emploi").trim();
  const appliedAt = item.created_at || new Date().toISOString();

  // Check if job application already exists for this contact & company
  let targetApp: JobApplicationRow | null = null;
  const { data: existingApps } = await supabase
    .from("job_applications")
    .select("*")
    .eq("user_id", userId)
    .eq("company_id", targetCompany.id)
    .ilike("channel_email", email)
    .limit(1);

  let isNewApplication = false;
  if (existingApps && existingApps.length > 0 && existingApps[0]) {
    targetApp = existingApps[0] as JobApplicationRow;
  } else {
    const { data: createdApp, error: appErr } = await supabase
      .from("job_applications")
      .insert({
        user_id: userId,
        company_id: targetCompany.id,
        primary_contact_id: targetContact.id,
        position: position,
        status: "sent",
        channel: "email",
        channel_email: email,
        applied_at: appliedAt,
        last_interaction_at: appliedAt,
        description: `Candidature transmise par email à ${email}.`,
      })
      .select()
      .single();

    if (appErr || !createdApp) {
      throw new Error(`Unable to create tracker application: ${appErr?.message || "Unknown error"}`);
    }
    targetApp = createdApp as JobApplicationRow;
    isNewApplication = true;

    // Record an initial timeline event
    try {
      await supabase.from("application_events").insert({
        user_id: userId,
        application_id: targetApp.id,
        contact_id: targetContact.id,
        type: "email_sent",
        channel: "email",
        occurred_at: appliedAt,
        summary: `Email de candidature envoyé à ${targetContact.full_name} (${email})`,
      });
    } catch {
      // Event logging is non-blocking
    }
  }

  if (!targetApp) {
    throw new Error(`Unable to resolve job application for "${email}"`);
  }

  return {
    companyId: targetCompany.id,
    companyName: targetCompany.name,
    contactId: targetContact.id,
    contactName: targetContact.full_name,
    applicationId: targetApp.id,
    isNewCompany,
    isNewContact,
    isNewApplication,
  };
}

/**
 * Bulk sync all existing rows from `applications` (the history table) into the Tracker:
 * Pre-fetches companies, contacts and applications into in-memory caches for ultra-fast,
 * non-blocking execution (under 2 seconds instead of minutes).
 */
export async function syncAllHistoryApplications(
  onProgress?: (processed: number, total: number) => void
): Promise<{
  total: number;
  companiesCreated: number;
  contactsCreated: number;
  applicationsCreated: number;
}> {
  const userId = await getAuthUserId();

  const [
    { data: historyRows, error: histErr },
    { data: existingCompanies },
    { data: existingContacts },
    { data: existingApps },
  ] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase.from("companies").select("*").eq("user_id", userId),
    supabase.from("contacts").select("*").eq("user_id", userId),
    supabase.from("job_applications").select("*").eq("user_id", userId),
  ]);

  if (histErr) {
    throw new Error(`Unable to read history: ${histErr.message}`);
  }

  const rows = historyRows || [];
  let companiesCreated = 0;
  let contactsCreated = 0;
  let applicationsCreated = 0;

  // In-memory lookups to eliminate repetitive DB queries
  const compByName = new Map<string, CompanyRow>();
  const compByDomain = new Map<string, CompanyRow>();
  for (const c of (existingCompanies || []) as CompanyRow[]) {
    compByName.set(c.name.trim().toLowerCase(), c);
    if (c.domain) compByDomain.set(c.domain.trim().toLowerCase(), c);
  }

  const contactByEmail = new Map<string, ContactRow>();
  for (const ct of (existingContacts || []) as ContactRow[]) {
    if (ct.email) contactByEmail.set(ct.email.trim().toLowerCase(), ct);
  }

  const appByEmail = new Map<string, JobApplicationRow>();
  for (const ap of (existingApps || []) as JobApplicationRow[]) {
    if (ap.channel_email) appByEmail.set(ap.channel_email.trim().toLowerCase(), ap);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.email) {
      if (onProgress) onProgress(i + 1, rows.length);
      continue;
    }
    const cleanEmail = row.email.trim().toLowerCase();

    try {
      // 1. Resolve Company
      let compName = (row.company || "").trim();
      const inferred = inferCompanyFromEmail(cleanEmail);
      if (
        !compName ||
        compName.toLowerCase() === "direct apply" ||
        compName.toLowerCase() === "carrier application"
      ) {
        compName = inferred?.name || "Candidature Directe";
      }
      const domain = inferred?.domain || null;
      const website = inferred?.website || null;

      let targetCompany = compByName.get(compName.toLowerCase());
      if (!targetCompany && domain) {
        targetCompany = compByDomain.get(domain.toLowerCase());
      }

      const detectedCountry = resolveCountryCategory(null, domain || cleanEmail);
      const detectedLocation =
        detectedCountry === "saudi"
          ? "Arabie Saoudite"
          : detectedCountry === "morocco"
          ? "Maroc"
          : detectedCountry === "france"
          ? "France"
          : null;

      if (!targetCompany) {
        const { data: createdComp, error: compErr } = await supabase
          .from("companies")
          .insert({
            user_id: userId,
            name: compName,
            domain: domain,
            website: website,
            sector: "Technologie & Services",
            location: detectedLocation,
          })
          .select()
          .single();

        if (!compErr && createdComp) {
          targetCompany = createdComp as CompanyRow;
          compByName.set(compName.toLowerCase(), targetCompany);
          if (domain) compByDomain.set(domain.toLowerCase(), targetCompany);
          companiesCreated++;
        }
      } else if (!targetCompany.location && detectedLocation) {
        targetCompany.location = detectedLocation;
        void supabase
          .from("companies")
          .update({ location: detectedLocation })
          .eq("id", targetCompany.id);
      }

      const companyId = targetCompany?.id || null;

      // 2. Resolve Contact
      let targetContact = contactByEmail.get(cleanEmail);
      if (!targetContact) {
        const parsed = parseContactFromEmail(cleanEmail, targetCompany?.name);
        const { data: createdContact, error: ctErr } = await supabase
          .from("contacts")
          .insert({
            user_id: userId,
            company_id: companyId,
            full_name: parsed.fullName,
            role: parsed.role,
            email: cleanEmail,
            next_action: "Suivre l'email de candidature envoyé",
          })
          .select()
          .single();

        if (!ctErr && createdContact) {
          targetContact = createdContact as ContactRow;
          contactByEmail.set(cleanEmail, targetContact);
          contactsCreated++;
        }
      } else if (companyId && !targetContact.company_id) {
        targetContact.company_id = companyId;
        void supabase
          .from("contacts")
          .update({ company_id: companyId })
          .eq("id", targetContact.id);
      }

      const contactId = targetContact?.id || null;

      // 3. Resolve Job Application
      let targetApp = appByEmail.get(cleanEmail);
      if (!targetApp) {
        const position = row.position?.trim() || "Candidature Spontanée";
        const appliedAt = row.created_at || new Date().toISOString();
        const { data: createdApp, error: appErr } = await supabase
          .from("job_applications")
          .insert({
            user_id: userId,
            company_id: companyId,
            primary_contact_id: contactId,
            position: position,
            status: "sent",
            channel: "email",
            channel_email: cleanEmail,
            applied_at: appliedAt,
            last_interaction_at: appliedAt,
            description: `Candidature transmise par email à ${cleanEmail}.`,
          })
          .select()
          .single();

        if (!appErr && createdApp) {
          targetApp = createdApp as JobApplicationRow;
          appByEmail.set(cleanEmail, targetApp);
          applicationsCreated++;
        }
      }
    } catch (err) {
      console.warn(`Failed to sync history item ${row.id} (${row.email}):`, err);
    }

    if (onProgress) {
      onProgress(i + 1, rows.length);
    }
  }

  return {
    total: rows.length,
    companiesCreated,
    contactsCreated,
    applicationsCreated,
  };
}

/**
 * Fetch the set of all emails marked as withdrawn/not found/bounced by the current user
 */
export async function getWithdrawnEmails(): Promise<Set<string>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Set();

    const { data, error } = await supabase
      .from("applications")
      .select("email")
      .eq("user_id", user.id)
      .eq("status", "withdrawn");

    if (error || !data) return new Set();

    const set = new Set<string>();
    data.forEach((row) => {
      if (row.email) {
        set.add(row.email.trim().toLowerCase());
      }
    });
    return set;
  } catch (err) {
    console.warn("Unable to fetch withdrawn emails:", err);
    return new Set();
  }
}

/**
 * Mark an application / email as withdrawn (not found / bounced / not delivered)
 */
export async function markEmailAsWithdrawn(email: string, applicationId?: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const cleanEmail = email.trim().toLowerCase();

  if (applicationId) {
    await supabase
      .from("applications")
      .update({ status: "withdrawn" })
      .eq("id", applicationId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("applications")
      .update({ status: "withdrawn" })
      .eq("email", cleanEmail)
      .eq("user_id", user.id);
  }

  // Also update corresponding job_applications in Tracker
  try {
    await supabase
      .from("job_applications")
      .update({ status: "withdrawn" })
      .eq("user_id", user.id)
      .eq("channel_email", cleanEmail);
  } catch (err) {
    console.warn("Tracker withdrawn sync warning:", err);
  }
}

/**
 * Restore an application / email from withdrawn back to normal
 */
export async function restoreWithdrawnEmail(email: string, applicationId?: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const cleanEmail = email.trim().toLowerCase();

  if (applicationId) {
    await supabase
      .from("applications")
      .update({ status: "success" })
      .eq("id", applicationId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("applications")
      .update({ status: "success" })
      .eq("email", cleanEmail)
      .eq("user_id", user.id);
  }

  try {
    await supabase
      .from("job_applications")
      .update({ status: "sent" })
      .eq("user_id", user.id)
      .eq("channel_email", cleanEmail);
  } catch (err) {
    console.warn("Tracker restore sync warning:", err);
  }
}

