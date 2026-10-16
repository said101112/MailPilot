import type { ApplicationFormValues, JobApplicationRow } from "./types";

export function emptyFormValues(overrides?: Partial<ApplicationFormValues>): ApplicationFormValues {
  return {
    position: "",
    jobType: "pfe",
    domain: "software_engineering",
    description: "",
    offerUrl: "",
    publishedAt: "",
    appliedAt: "",
    location: "",
    workMode: "onsite",
    channel: "linkedin_job",
    channelUrl: "",
    channelEmail: "",
    channelPhone: "",
    status: "draft",
    companyId: null,
    companyName: "",
    companyWebsite: "",
    companyDomain: "",
    companyLogoUrl: "",
    companySector: "",
    companyLocation: "",
    companyDescription: "",
    companyWikidataId: null,
    primaryContactId: null,
    ...overrides,
  };
}

export function formValuesFromApplication(
  application: JobApplicationRow,
): ApplicationFormValues {
  return emptyFormValues({
    position: application.position ?? "",
    jobType: application.job_type ?? "pfe",
    domain: application.domain ?? "software_engineering",
    description: application.description ?? "",
    offerUrl: application.offer_url ?? "",
    publishedAt: application.published_at ?? "",
    appliedAt: application.applied_at ?? "",
    location: application.location ?? "",
    workMode: application.work_mode ?? "onsite",
    channel: application.channel ?? "linkedin_job",
    channelUrl: application.channel_url ?? "",
    channelEmail: application.channel_email ?? "",
    channelPhone: application.channel_phone ?? "",
    status: application.status,
    companyId: application.company_id,
    companyName: application.company?.name ?? "",
    companyWebsite: application.company?.website ?? "",
    companyDomain: "",
    companyLogoUrl: application.company?.logo_url ?? "",
    companySector: application.company?.sector ?? "",
    companyLocation: application.company?.location ?? "",
    companyDescription: "",
    companyWikidataId: null,
    primaryContactId: application.primary_contact_id,
  });
}
