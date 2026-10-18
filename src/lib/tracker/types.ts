import type { JobStatus } from "./constants";

export interface CompanyRow {
  id: string;
  user_id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  sector: string | null;
  location: string | null;
  wikidata_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRow {
  id: string;
  user_id: string;
  company_id: string | null;
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  whatsapp: string | null;
  notes: string | null;
  last_interaction_at: string | null;
  next_action: string | null;
  created_at: string;
  updated_at: string;
  company?: Pick<CompanyRow, "id" | "name" | "logo_url" | "location"> | null;
}

export interface JobApplicationRow {
  id: string;
  user_id: string;
  company_id: string | null;
  primary_contact_id: string | null;
  position: string;
  job_type: string | null;
  domain: string | null;
  description: string | null;
  offer_url: string | null;
  published_at: string | null;
  applied_at: string | null;
  location: string | null;
  work_mode: string | null;
  channel: string | null;
  channel_url: string | null;
  channel_email: string | null;
  channel_phone: string | null;
  status: JobStatus | string;
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string;
  company?: Pick<CompanyRow, "id" | "name" | "logo_url" | "website" | "sector" | "location" | "description" | "domain"> | null;
  primary_contact?: Pick<ContactRow, "id" | "full_name" | "role"> | null;
  follow_ups?: Array<{
    id: string;
    due_date: string;
    status: string;
    reason: string | null;
  }>;
}

export interface ApplicationEventRow {
  id: string;
  user_id: string;
  application_id: string;
  contact_id: string | null;
  type: string;
  channel: string | null;
  occurred_at: string;
  summary: string | null;
  content: string | null;
  link: string | null;
  notes: string | null;
  created_at: string;
  contact?: Pick<ContactRow, "id" | "full_name"> | null;
}

export interface InterviewRow {
  id: string;
  user_id: string;
  application_id: string;
  company_id: string | null;
  type: string;
  scheduled_at: string;
  timezone: string | null;
  format: string | null;
  meeting_url: string | null;
  location: string | null;
  interviewers: string | null;
  status: string;
  prep_notes: string | null;
  questions: string | null;
  feedback: string | null;
  result: string | null;
  next_step: string | null;
  created_at: string;
  updated_at: string;
  application?: Pick<JobApplicationRow, "id" | "position" | "status"> & {
    company?: Pick<CompanyRow, "id" | "name" | "logo_url"> | null;
  } | null;
}

export interface ApplicationNoteRow {
  id: string;
  user_id: string;
  application_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface FollowUpRow {
  id: string;
  user_id: string;
  application_id: string;
  contact_id: string | null;
  due_date: string;
  channel: string | null;
  reason: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  application?: Pick<JobApplicationRow, "id" | "position" | "status" | "applied_at"> & {
    company?: Pick<CompanyRow, "id" | "name" | "logo_url"> | null;
  } | null;
  contact?: Pick<ContactRow, "id" | "full_name"> | null;
}

export interface StatusHistoryRow {
  id: string;
  user_id: string;
  application_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_at: string;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  application_id: string | null;
  company_id: string | null;
  name: string;
  doc_type: string | null;
  url: string | null;
  notes: string | null;
  created_at: string;
}

export interface CompanySearchResult {
  id: string;
  name: string;
  domain: string | null;
  logoUrl: string | null;
  website: string | null;
  description: string | null;
  sector: string | null;
  location: string | null;
  wikidataId: string | null;
}

export interface ApplicationFormValues {
  position: string;
  jobType: string;
  domain: string;
  description: string;
  offerUrl: string;
  publishedAt: string;
  appliedAt: string;
  location: string;
  workMode: string;
  channel: string;
  channelUrl: string;
  channelEmail: string;
  channelPhone: string;
  status: JobStatus | string;
  companyId: string | null;
  companyName: string;
  companyWebsite: string;
  companyDomain: string;
  companyLogoUrl: string;
  companySector: string;
  companyLocation: string;
  companyDescription: string;
  companyWikidataId: string | null;
  primaryContactId: string | null;
}
