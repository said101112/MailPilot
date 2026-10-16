import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";
import type { JobStatus } from "./constants";
import type {
  ApplicationEventRow,
  ApplicationFormValues,
  ApplicationNoteRow,
  CompanyRow,
  ContactRow,
  DocumentRow,
  FollowUpRow,
  InterviewRow,
  JobApplicationRow,
  StatusHistoryRow,
} from "./types";

function throwIfError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export async function listCompanies(): Promise<CompanyRow[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  throwIfError(error, "Unable to load companies.");
  return data ?? [];
}

export async function getCompany(id: string): Promise<CompanyRow | null> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  throwIfError(error, "Unable to load the company.");
  return data;
}

export async function findCompanyByName(
  name: string,
): Promise<CompanyRow | null> {
  const userId = await getAuthUserId();
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", normalized)
    .limit(1);
  throwIfError(error, "Unable to search companies.");
  return data?.[0] ?? null;
}

export interface CompanyPayload {
  name: string;
  domain?: string | null;
  logo_url?: string | null;
  website?: string | null;
  description?: string | null;
  sector?: string | null;
  location?: string | null;
  wikidata_id?: string | null;
  notes?: string | null;
}

export async function createCompany(payload: CompanyPayload): Promise<CompanyRow> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...payload, user_id: userId })
    .select()
    .single();
  throwIfError(error, "Unable to create the company.");
  return data as CompanyRow;
}

export async function updateCompany(
  id: string,
  patch: Partial<CompanyPayload>,
): Promise<CompanyRow> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("companies")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  throwIfError(error, "Unable to update the company.");
  return data as CompanyRow;
}

/**
 * Reuse an existing company when a similar name already exists,
 * otherwise create a new one. Never silently swaps companies:
 * callers pass an explicit companyId when the user picked a result.
 */
export async function resolveCompany(
  values: Pick<
    ApplicationFormValues,
    | "companyId"
    | "companyName"
    | "companyWebsite"
    | "companyDomain"
    | "companyLogoUrl"
    | "companySector"
    | "companyLocation"
    | "companyDescription"
    | "companyWikidataId"
  >,
): Promise<string | null> {
  const name = values.companyName.trim();
  if (!name) return null;

  if (values.companyId) {
    await updateCompany(values.companyId, {
      name: values.companyName.trim() || undefined,
      website: values.companyWebsite.trim() || null,
      domain: values.companyDomain.trim() || null,
      logo_url: values.companyLogoUrl.trim() || null,
      sector: values.companySector.trim() || null,
      location: values.companyLocation.trim() || null,
      description: values.companyDescription.trim() || null,
      wikidata_id: values.companyWikidataId || null,
    });
    return values.companyId;
  }

  const existing = await findCompanyByName(name);
  if (existing) {
    return existing.id;
  }

  const created = await createCompany({
    name,
    website: values.companyWebsite.trim() || null,
    domain: values.companyDomain.trim() || null,
    logo_url: values.companyLogoUrl.trim() || null,
    sector: values.companySector.trim() || null,
    location: values.companyLocation.trim() || null,
    description: values.companyDescription.trim() || null,
    wikidata_id: values.companyWikidataId || null,
  });
  return created.id;
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

const CONTACT_SELECT =
  "*, company:companies(id, name, logo_url)";

export async function listContacts(companyId?: string): Promise<ContactRow[]> {
  const userId = await getAuthUserId();
  let query = supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .eq("user_id", userId);
  if (companyId) query = query.eq("company_id", companyId);
  const { data, error } = await query.order("full_name", { ascending: true });
  throwIfError(error, "Unable to load contacts.");
  return (data ?? []) as ContactRow[];
}

export interface ContactPayload {
  full_name: string;
  company_id?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  next_action?: string | null;
}

export async function createContact(payload: ContactPayload): Promise<ContactRow> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...payload, user_id: userId })
    .select(CONTACT_SELECT)
    .single();
  throwIfError(error, "Unable to create the contact.");
  return data as ContactRow;
}

export async function updateContact(
  id: string,
  patch: Partial<ContactPayload>,
): Promise<ContactRow> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(CONTACT_SELECT)
    .single();
  throwIfError(error, "Unable to update the contact.");
  return data as ContactRow;
}

export async function deleteContact(id: string): Promise<void> {
  const userId = await getAuthUserId();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  throwIfError(error, "Unable to delete the contact.");
}

// ---------------------------------------------------------------------------
// Job applications
// ---------------------------------------------------------------------------

const APPLICATION_SELECT = `
  *,
  company:companies(id, name, logo_url, website, sector, location),
  primary_contact:contacts(id, full_name, role),
  follow_ups:follow_ups(id, due_date, status, reason)
`;

export interface ApplicationFilters {
  search?: string;
  status?: JobStatus | "all";
  companyId?: string;
}

export async function listApplications(
  filters: ApplicationFilters = {},
): Promise<JobApplicationRow[]> {
  const userId = await getAuthUserId();
  let query = supabase
    .from("job_applications")
    .select(APPLICATION_SELECT)
    .eq("user_id", userId);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.companyId) {
    query = query.eq("company_id", filters.companyId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  throwIfError(error, "Unable to load applications.");

  let rows = (data ?? []) as JobApplicationRow[];
  const search = filters.search?.trim().toLowerCase();
  if (search) {
    rows = rows.filter((row) => {
      const haystack = [
        row.position,
        row.company?.name,
        row.location,
        row.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }
  return rows;
}

export async function getApplication(id: string): Promise<JobApplicationRow | null> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("job_applications")
    .select(APPLICATION_SELECT)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  throwIfError(error, "Unable to load the application.");
  return data as JobApplicationRow | null;
}

export async function createApplication(
  values: ApplicationFormValues,
): Promise<JobApplicationRow> {
  const userId = await getAuthUserId();
  const companyId = await resolveCompany(values);

  const { data, error } = await supabase
    .from("job_applications")
    .insert({
      user_id: userId,
      company_id: companyId,
      primary_contact_id: values.primaryContactId || null,
      position: values.position.trim(),
      job_type: values.jobType || null,
      domain: values.domain || null,
      description: values.description.trim() || null,
      offer_url: values.offerUrl.trim() || null,
      published_at: values.publishedAt || null,
      applied_at: values.appliedAt || null,
      location: values.location.trim() || null,
      work_mode: values.workMode || null,
      channel: values.channel || null,
      channel_url: values.channelUrl.trim() || null,
      channel_email: values.channelEmail.trim() || null,
      channel_phone: values.channelPhone.trim() || null,
      status: (values.status as JobStatus) || "draft",
    })
    .select("id")
    .single();
  throwIfError(error, "Unable to create the application.");
  if (!data?.id) throw new Error("Unable to create the application.");

  const applicationId = data.id as string;
  await supabase.from("application_status_history").insert({
    user_id: userId,
    application_id: applicationId,
    from_status: null,
    to_status: (values.status as JobStatus) || "draft",
    note: "Candidature créée",
  });

  const created = await getApplication(applicationId);
  if (!created) throw new Error("The application was created but could not be reloaded.");
  return created;
}

export async function updateApplication(
  id: string,
  values: ApplicationFormValues,
): Promise<JobApplicationRow> {
  const userId = await getAuthUserId();
  const companyId = await resolveCompany(values);

  const { error } = await supabase
    .from("job_applications")
    .update({
      company_id: companyId,
      primary_contact_id: values.primaryContactId || null,
      position: values.position.trim(),
      job_type: values.jobType || null,
      domain: values.domain || null,
      description: values.description.trim() || null,
      offer_url: values.offerUrl.trim() || null,
      published_at: values.publishedAt || null,
      applied_at: values.appliedAt || null,
      location: values.location.trim() || null,
      work_mode: values.workMode || null,
      channel: values.channel || null,
      channel_url: values.channelUrl.trim() || null,
      channel_email: values.channelEmail.trim() || null,
      channel_phone: values.channelPhone.trim() || null,
    })
    .eq("user_id", userId)
    .eq("id", id);
  throwIfError(error, "Unable to update the application.");

  const updated = await getApplication(id);
  if (!updated) throw new Error("The application could not be reloaded after update.");
  return updated;
}

export async function changeApplicationStatus(
  application: Pick<JobApplicationRow, "id" | "status" | "position">,
  toStatus: JobStatus,
  note?: string,
): Promise<void> {
  const userId = await getAuthUserId();
  const fromStatus = application.status;

  if (fromStatus === toStatus) return;

  const { error } = await supabase
    .from("job_applications")
    .update({ status: toStatus })
    .eq("user_id", userId)
    .eq("id", application.id);
  throwIfError(error, "Unable to update the status.");

  await supabase.from("application_status_history").insert({
    user_id: userId,
    application_id: application.id,
    from_status: fromStatus,
    to_status: toStatus,
    note: note?.trim() || null,
  });

  await supabase.from("application_events").insert({
    user_id: userId,
    application_id: application.id,
    type: "status_change",
    summary: `Statut modifié : ${fromStatus} → ${toStatus}`,
    notes: note?.trim() || null,
    occurred_at: new Date().toISOString(),
  });
}

export async function deleteApplication(id: string): Promise<void> {
  const userId = await getAuthUserId();
  const { error } = await supabase
    .from("job_applications")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  throwIfError(error, "Unable to delete the application.");
}

// ---------------------------------------------------------------------------
// Events (timeline)
// ---------------------------------------------------------------------------

export async function listEvents(applicationId: string): Promise<ApplicationEventRow[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("application_events")
    .select("*, contact:contacts(id, full_name)")
    .eq("user_id", userId)
    .eq("application_id", applicationId)
    .order("occurred_at", { ascending: false });
  throwIfError(error, "Unable to load the timeline.");
  return (data ?? []) as ApplicationEventRow[];
}

export interface EventPayload {
  application_id: string;
  type: string;
  channel?: string | null;
  contact_id?: string | null;
  occurred_at?: string;
  summary?: string | null;
  content?: string | null;
  link?: string | null;
  notes?: string | null;
}

export async function logEvent(payload: EventPayload): Promise<ApplicationEventRow> {
  const userId = await getAuthUserId();
  const occurredAt = payload.occurred_at ?? new Date().toISOString();

  const { data, error } = await supabase
    .from("application_events")
    .insert({
      ...payload,
      occurred_at: occurredAt,
      user_id: userId,
    })
    .select("*, contact:contacts(id, full_name)")
    .single();
  throwIfError(error, "Unable to save the interaction.");

  const { data: currentApp } = await supabase
    .from("job_applications")
    .select("last_interaction_at")
    .eq("user_id", userId)
    .eq("id", payload.application_id)
    .maybeSingle();

  const currentLast = currentApp?.last_interaction_at;
  if (!currentLast || new Date(occurredAt) > new Date(currentLast)) {
    await supabase
      .from("job_applications")
      .update({ last_interaction_at: occurredAt })
      .eq("user_id", userId)
      .eq("id", payload.application_id);
  }

  if (payload.contact_id) {
    await supabase
      .from("contacts")
      .update({ last_interaction_at: occurredAt })
      .eq("user_id", userId)
      .eq("id", payload.contact_id);
  }

  return data as ApplicationEventRow;
}

export async function deleteEvent(id: string): Promise<void> {
  const userId = await getAuthUserId();
  const { error } = await supabase
    .from("application_events")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  throwIfError(error, "Unable to delete the interaction.");
}

// ---------------------------------------------------------------------------
// Status history
// ---------------------------------------------------------------------------

export async function listStatusHistory(
  applicationId: string,
): Promise<StatusHistoryRow[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("application_status_history")
    .select("*")
    .eq("user_id", userId)
    .eq("application_id", applicationId)
    .order("changed_at", { ascending: false });
  throwIfError(error, "Unable to load the status history.");
  return (data ?? []) as StatusHistoryRow[];
}

// ---------------------------------------------------------------------------
// Interviews
// ---------------------------------------------------------------------------

const INTERVIEW_SELECT = `
  *,
  application:job_applications(id, position, status, company:companies(id, name, logo_url))
`;

export async function listInterviews(options?: {
  applicationId?: string;
  upcomingOnly?: boolean;
}): Promise<InterviewRow[]> {
  const userId = await getAuthUserId();
  let query = supabase
    .from("interviews")
    .select(INTERVIEW_SELECT)
    .eq("user_id", userId);
  if (options?.applicationId) query = query.eq("application_id", options.applicationId);
  if (options?.upcomingOnly) {
    query = query.gte("scheduled_at", new Date().toISOString());
  }
  const { data, error } = await query.order("scheduled_at", { ascending: true });
  throwIfError(error, "Unable to load interviews.");
  return (data ?? []) as InterviewRow[];
}

export interface InterviewPayload {
  application_id: string;
  company_id?: string | null;
  type: string;
  scheduled_at: string;
  timezone?: string | null;
  format?: string | null;
  meeting_url?: string | null;
  location?: string | null;
  interviewers?: string | null;
  status?: string;
  prep_notes?: string | null;
  questions?: string | null;
  feedback?: string | null;
  result?: string | null;
  next_step?: string | null;
}

export async function createInterview(payload: InterviewPayload): Promise<InterviewRow> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("interviews")
    .insert({ ...payload, user_id: userId })
    .select("id")
    .single();
  throwIfError(error, "Unable to create the interview.");
  if (!data?.id) throw new Error("Unable to create the interview.");

  await supabase.from("application_events").insert({
    user_id: userId,
    application_id: payload.application_id,
    type: "interview_invitation",
    summary: "Entretien programmé",
    occurred_at: new Date().toISOString(),
  });

  const created = await supabase
    .from("interviews")
    .select(INTERVIEW_SELECT)
    .eq("id", data.id)
    .single();
  throwIfError(created.error, "Unable to reload the interview.");
  return created.data as InterviewRow;
}

export async function updateInterview(
  id: string,
  patch: Partial<InterviewPayload>,
): Promise<InterviewRow> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("interviews")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(INTERVIEW_SELECT)
    .single();
  throwIfError(error, "Unable to update the interview.");
  return data as InterviewRow;
}

export async function deleteInterview(id: string): Promise<void> {
  const userId = await getAuthUserId();
  const { error } = await supabase
    .from("interviews")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  throwIfError(error, "Unable to delete the interview.");
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function listNotes(applicationId: string): Promise<ApplicationNoteRow[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("application_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  throwIfError(error, "Unable to load notes.");
  return (data ?? []) as ApplicationNoteRow[];
}

export async function addNote(
  applicationId: string,
  content: string,
): Promise<ApplicationNoteRow> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("application_notes")
    .insert({ user_id: userId, application_id: applicationId, content: content.trim() })
    .select()
    .single();
  throwIfError(error, "Unable to save the note.");
  return data as ApplicationNoteRow;
}

export async function deleteNote(id: string): Promise<void> {
  const userId = await getAuthUserId();
  const { error } = await supabase
    .from("application_notes")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  throwIfError(error, "Unable to delete the note.");
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

const FOLLOW_UP_SELECT = `
  *,
  application:job_applications(id, position, status, applied_at, last_interaction_at, company:companies(id, name, logo_url)),
  contact:contacts(id, full_name)
`;

export async function listFollowUps(options?: {
  applicationId?: string;
  status?: string;
}): Promise<FollowUpRow[]> {
  const userId = await getAuthUserId();
  let query = supabase
    .from("follow_ups")
    .select(FOLLOW_UP_SELECT)
    .eq("user_id", userId);
  if (options?.applicationId) query = query.eq("application_id", options.applicationId);
  if (options?.status) query = query.eq("status", options.status);
  const { data, error } = await query.order("due_date", { ascending: true });
  throwIfError(error, "Unable to load follow-ups.");
  return (data ?? []) as FollowUpRow[];
}

export interface FollowUpPayload {
  application_id: string;
  contact_id?: string | null;
  due_date: string;
  channel?: string | null;
  reason?: string | null;
  status?: string;
}

export async function createFollowUp(payload: FollowUpPayload): Promise<FollowUpRow> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("follow_ups")
    .insert({ ...payload, user_id: userId })
    .select(FOLLOW_UP_SELECT)
    .single();
  throwIfError(error, "Unable to create the follow-up.");
  return data as FollowUpRow;
}

export async function updateFollowUp(
  id: string,
  patch: Partial<FollowUpPayload>,
): Promise<FollowUpRow> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("follow_ups")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(FOLLOW_UP_SELECT)
    .single();
  throwIfError(error, "Unable to update the follow-up.");
  return data as FollowUpRow;
}

export async function completeFollowUp(id: string): Promise<void> {
  const row = await updateFollowUp(id, {
    status: "done",
  });
  await supabase
    .from("follow_ups")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id);

  await logEvent({
    application_id: row.application_id,
    type: "follow_up_done",
    contact_id: row.contact_id,
    summary: row.reason ? `Relance effectuée : ${row.reason}` : "Relance effectuée",
  });
}

export async function deleteFollowUp(id: string): Promise<void> {
  const userId = await getAuthUserId();
  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  throwIfError(error, "Unable to delete the follow-up.");
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function listDocuments(applicationId: string): Promise<DocumentRow[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  throwIfError(error, "Unable to load documents.");
  return (data ?? []) as DocumentRow[];
}

export interface DocumentPayload {
  application_id: string;
  company_id?: string | null;
  name: string;
  doc_type?: string | null;
  url?: string | null;
  notes?: string | null;
}

export async function addDocument(payload: DocumentPayload): Promise<DocumentRow> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("documents")
    .insert({ ...payload, user_id: userId })
    .select()
    .single();
  throwIfError(error, "Unable to save the document.");
  return data as DocumentRow;
}

export async function deleteDocument(id: string): Promise<void> {
  const userId = await getAuthUserId();
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  throwIfError(error, "Unable to delete the document.");
}
