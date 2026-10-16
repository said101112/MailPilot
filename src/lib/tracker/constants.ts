export const JOB_STATUSES = [
  "draft",
  "sent",
  "awaiting_reply",
  "reply_received",
  "interview_hr",
  "interview_technical",
  "interview_final",
  "assessment",
  "awaiting_decision",
  "offer_received",
  "accepted",
  "rejected",
  "withdrawn",
  "closed_expired",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "À préparer",
  sent: "Candidature envoyée",
  awaiting_reply: "En attente de réponse",
  reply_received: "Réponse reçue",
  interview_hr: "Entretien RH programmé",
  interview_technical: "Entretien technique programmé",
  interview_final: "Entretien final programmé",
  assessment: "Test technique",
  awaiting_decision: "En attente de décision",
  offer_received: "Offre reçue",
  accepted: "Acceptée",
  rejected: "Refusée",
  withdrawn: "Retirée",
  closed_expired: "Poste fermé / expiré",
};

export const JOB_STATUS_TONES: Record<JobStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-700",
  awaiting_reply: "bg-amber-50 text-amber-700",
  reply_received: "bg-indigo-50 text-indigo-700",
  interview_hr: "bg-violet-50 text-violet-700",
  interview_technical: "bg-violet-50 text-violet-700",
  interview_final: "bg-violet-50 text-violet-700",
  assessment: "bg-cyan-50 text-cyan-700",
  awaiting_decision: "bg-amber-50 text-amber-800",
  offer_received: "bg-emerald-50 text-emerald-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-50 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
  closed_expired: "bg-gray-100 text-gray-500",
};

export type KanbanColumn = {
  id: string;
  title: string;
  statuses: JobStatus[];
  defaultStatus: JobStatus;
};

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "todo", title: "À préparer", statuses: ["draft"], defaultStatus: "draft" },
  { id: "sent", title: "Envoyée", statuses: ["sent"], defaultStatus: "sent" },
  {
    id: "waiting",
    title: "En attente",
    statuses: ["awaiting_reply", "reply_received", "assessment", "awaiting_decision"],
    defaultStatus: "awaiting_reply",
  },
  {
    id: "interview",
    title: "Entretiens",
    statuses: ["interview_hr", "interview_technical", "interview_final"],
    defaultStatus: "interview_hr",
  },
  {
    id: "offer",
    title: "Offre",
    statuses: ["offer_received", "accepted"],
    defaultStatus: "offer_received",
  },
  {
    id: "closed",
    title: "Clôturée",
    statuses: ["rejected", "withdrawn", "closed_expired"],
    defaultStatus: "rejected",
  },
];

export const JOB_TYPES = [
  { value: "pfe", label: "PFE" },
  { value: "internship", label: "Stage" },
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "alternance", label: "Alternance" },
  { value: "freelance", label: "Freelance" },
  { value: "other", label: "Autre" },
] as const;

export const JOB_DOMAINS = [
  { value: "software_engineering", label: "Software Engineering" },
  { value: "fullstack", label: "Full Stack" },
  { value: "backend", label: "Backend" },
  { value: "frontend", label: "Frontend" },
  { value: "cloud_devops", label: "Cloud / DevOps" },
  { value: "ai_data", label: "AI / Data" },
  { value: "mobile", label: "Mobile" },
  { value: "qa", label: "QA / Testing" },
  { value: "cybersecurity", label: "Cybersécurité" },
  { value: "embedded", label: "Embarqué / IoT" },
  { value: "other", label: "Autre" },
] as const;

export const WORK_MODES = [
  { value: "onsite", label: "Présentiel" },
  { value: "hybrid", label: "Hybride" },
  { value: "remote", label: "Remote" },
] as const;

export const APPLICATION_CHANNELS = [
  { value: "linkedin_job", label: "LinkedIn — offre d'emploi" },
  { value: "linkedin_message", label: "LinkedIn — message direct" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "company_website", label: "Site officiel de l'entreprise" },
  { value: "job_board", label: "Plateforme de recrutement" },
  { value: "referral", label: "Recommandation / cooptation" },
  { value: "phone", label: "Appel téléphonique" },
  { value: "event", label: "Événement / forum" },
  { value: "school_career", label: "École / service carrière" },
  { value: "agency", label: "Cabinet de recrutement" },
  { value: "other", label: "Autre" },
] as const;

export type ApplicationChannel =
  (typeof APPLICATION_CHANNELS)[number]["value"];

export const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  APPLICATION_CHANNELS.map((c) => [c.value, c.label]),
);

export const EVENT_TYPES = [
  { value: "email_sent", label: "Email envoyé" },
  { value: "email_received", label: "Email reçu" },
  { value: "linkedin_message_sent", label: "Message LinkedIn envoyé" },
  { value: "linkedin_message_received", label: "Message LinkedIn reçu" },
  { value: "whatsapp_sent", label: "Message WhatsApp envoyé" },
  { value: "whatsapp_received", label: "Message WhatsApp reçu" },
  { value: "phone_call", label: "Appel téléphonique" },
  { value: "recruiter_reply", label: "Réponse du recruteur" },
  { value: "interview_invitation", label: "Invitation à un entretien" },
  { value: "test_received", label: "Test technique reçu" },
  { value: "test_completed", label: "Test technique terminé" },
  { value: "status_change", label: "Changement de statut" },
  { value: "follow_up_done", label: "Relance effectuée" },
  { value: "note", label: "Note personnelle" },
  { value: "other", label: "Autre interaction" },
] as const;

export const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPES.map((e) => [e.value, e.label]),
);

export const INTERVIEW_TYPES = [
  { value: "hr", label: "RH" },
  { value: "technical", label: "Technique" },
  { value: "manager", label: "Manager" },
  { value: "final", label: "Final" },
  { value: "other", label: "Autre" },
] as const;

export const INTERVIEW_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  INTERVIEW_TYPES.map((t) => [t.value, t.label]),
);

export const INTERVIEW_FORMATS = [
  { value: "video", label: "Visioconférence" },
  { value: "phone", label: "Téléphone" },
  { value: "onsite", label: "Présentiel" },
] as const;

export const INTERVIEW_FORMAT_LABELS: Record<string, string> =
  Object.fromEntries(INTERVIEW_FORMATS.map((f) => [f.value, f.label]));

export const INTERVIEW_STATUSES = [
  { value: "scheduled", label: "Prévu" },
  { value: "completed", label: "Terminé" },
  { value: "postponed", label: "Reporté" },
  { value: "cancelled", label: "Annulé" },
] as const;

export const INTERVIEW_STATUS_LABELS: Record<string, string> =
  Object.fromEntries(INTERVIEW_STATUSES.map((s) => [s.value, s.label]));

export const INTERVIEW_STATUS_TONES: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  postponed: "bg-amber-50 text-amber-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export const FOLLOW_UP_STATUSES = [
  { value: "todo", label: "À faire" },
  { value: "done", label: "Effectuée" },
  { value: "cancelled", label: "Annulée" },
] as const;

export const FOLLOW_UP_STATUS_LABELS: Record<string, string> =
  Object.fromEntries(FOLLOW_UP_STATUSES.map((s) => [s.value, s.label]));

export const CONTACT_ROLES = [
  "Recruteur",
  "RH",
  "Ingénieur",
  "Manager",
  "Responsable technique",
  "Ancien étudiant",
  "Fondateur",
  "Cabinet de recrutement",
  "Autre",
] as const;

export const DOCUMENT_TYPES = [
  { value: "cv", label: "CV" },
  { value: "cover_letter", label: "Lettre de motivation" },
  { value: "portfolio", label: "Portfolio" },
  { value: "offer", label: "Offre / annonce" },
  { value: "contract", label: "Contrat" },
  { value: "other", label: "Autre" },
] as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> =
  Object.fromEntries(DOCUMENT_TYPES.map((d) => [d.value, d.label]));
