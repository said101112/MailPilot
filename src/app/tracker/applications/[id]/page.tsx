"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  FileText,
  History as HistoryIcon,
  Link2,
  Mail,
  MessageSquare,
  NotebookPen,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState, LoadingBlock } from "@/components/tracker/Feedback";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import StatusBadge from "@/components/tracker/StatusBadge";
import ApplicationFormModal from "@/components/tracker/ApplicationFormModal";
import InterviewFormModal from "@/components/tracker/InterviewFormModal";
import FollowUpFormModal from "@/components/tracker/FollowUpFormModal";
import ContactFormModal from "@/components/tracker/ContactFormModal";
import {
  APPLICATION_CHANNELS,
  CHANNEL_LABELS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  FOLLOW_UP_STATUS_LABELS,
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUS_TONES,
  INTERVIEW_TYPE_LABELS,
  JOB_DOMAINS,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  JOB_TYPES,
  WORK_MODES,
  type JobStatus,
} from "@/lib/tracker/constants";
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  toDatetimeLocalValue,
} from "@/lib/tracker/format";
import {
  addDocument,
  addNote,
  changeApplicationStatus,
  completeFollowUp,
  deleteApplication,
  deleteDocument,
  deleteEvent,
  deleteNote,
  getApplication,
  listCompanies,
  listContacts,
  listDocuments,
  listEvents,
  listFollowUps,
  listInterviews,
  listNotes,
  listStatusHistory,
  logEvent,
  updateInterview,
} from "@/lib/tracker/queries";
import type {
  ApplicationEventRow,
  ApplicationNoteRow,
  CompanyRow,
  ContactRow,
  DocumentRow,
  FollowUpRow,
  InterviewRow,
  JobApplicationRow,
  StatusHistoryRow,
} from "@/lib/tracker/types";

const TABS = [
  { id: "overview", label: "Vue d'ensemble", icon: FileText },
  { id: "company", label: "Entreprise & contacts", icon: Building2 },
  { id: "history", label: "Historique", icon: HistoryIcon },
  { id: "interviews", label: "Entretiens", icon: CalendarClock },
  { id: "notes", label: "Notes", icon: NotebookPen },
  { id: "documents", label: "Documents & liens", icon: Link2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      <p className="mt-0.5 text-xs text-gray-900">{value || "—"}</p>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const applicationId = params.id;

  const [application, setApplication] = useState<JobApplicationRow | null>(null);
  const [events, setEvents] = useState<ApplicationEventRow[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [notes, setNotes] = useState<ApplicationNoteRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("overview");

  const [editOpen, setEditOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const [statusNote, setStatusNote] = useState("");
  const [showStatusNote, setShowStatusNote] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");

  const [eventType, setEventType] = useState("email_sent");
  const [eventChannel, setEventChannel] = useState("email");
  const [eventContactId, setEventContactId] = useState("");
  const [eventSummary, setEventSummary] = useState("");
  const [eventContent, setEventContent] = useState("");
  const [eventLink, setEventLink] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [eventOccurredAt, setEventOccurredAt] = useState(() =>
    toDatetimeLocalValue(new Date().toISOString()),
  );
  const [savingEvent, setSavingEvent] = useState(false);

  const [noteContent, setNoteContent] = useState("");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("cv");
  const [docUrl, setDocUrl] = useState("");
  const [docNotes, setDocNotes] = useState("");

  const load = useCallback(async () => {
    try {
      const [
        app,
        eventRows,
        historyRows,
        interviewRows,
        noteRows,
        documentRows,
        companyRows,
      ] = await Promise.all([
        getApplication(applicationId),
        listEvents(applicationId),
        listStatusHistory(applicationId),
        listInterviews({ applicationId }),
        listNotes(applicationId),
        listDocuments(applicationId),
        listCompanies(),
      ]);
      if (!app) {
        toast.error("Candidature introuvable.");
        router.push("/tracker/applications");
        return;
      }
      setApplication(app);
      setEvents(eventRows);
      setStatusHistory(historyRows);
      setInterviews(interviewRows);
      setNotes(noteRows);
      setDocuments(documentRows);
      setCompanies(companyRows);
      const [contactRows, followUpRows] = await Promise.all([
        app.company_id ? listContacts(app.company_id) : Promise.resolve([]),
        listFollowUps({ applicationId }),
      ]);
      setContacts(contactRows);
      setFollowUps(followUpRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load the application.");
    } finally {
      setLoading(false);
    }
  }, [applicationId, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const labelFor = useCallback((collection: ReadonlyArray<{ value: string; label: string }>, value?: string | null) => {
    if (!value) return "—";
    return collection.find((item) => item.value === value)?.label ?? value;
  }, []);

  const handleStatusChange = async (nextStatus: string) => {
    if (!application || nextStatus === application.status) return;
    setPendingStatus(nextStatus);
    setShowStatusNote(true);
  };

  const confirmStatusChange = async () => {
    if (!application || !pendingStatus) return;
    try {
      await changeApplicationStatus(
        application,
        pendingStatus as JobStatus,
        statusNote.trim() || undefined,
      );
      toast.success(`Statut : ${JOB_STATUS_LABELS[pendingStatus as JobStatus]}`);
      setShowStatusNote(false);
      setStatusNote("");
      setPendingStatus("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to change the status.");
    }
  };

  const handleLogEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!application) return;
    setSavingEvent(true);
    try {
      await logEvent({
        application_id: application.id,
        type: eventType,
        channel: eventChannel || null,
        contact_id: eventContactId || null,
        occurred_at: new Date(eventOccurredAt).toISOString(),
        summary: eventSummary.trim() || null,
        content: eventContent.trim() || null,
        link: eventLink.trim() || null,
        notes: eventNotes.trim() || null,
      });
      toast.success("Interaction enregistrée.");
      setEventSummary("");
      setEventContent("");
      setEventLink("");
      setEventNotes("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the interaction.");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDelete = async () => {
    if (!application) return;
    if (!window.confirm("Supprimer définitivement cette candidature et tout son historique ?")) {
      return;
    }
    try {
      await deleteApplication(application.id);
      toast.success("Candidature supprimée.");
      router.push("/tracker/applications");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete.");
    }
  };

  const whatsappHref = (() => {
    if (!application?.channel_phone) return null;
    const digits = application.channel_phone.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : null;
  })();

  if (loading) {
    return (
      <div className="page-shell">
        <LoadingBlock label="Chargement de la candidature..." />
      </div>
    );
  }

  if (!application) return null;

  const company = application.company;

  return (
    <div className="page-shell">
      <Link
        href="/tracker/applications"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour aux candidatures
      </Link>

      <div className="mt-3 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <CompanyLogo
              name={company?.name ?? "?"}
              logoUrl={company?.logo_url}
              website={company?.website}
              className="h-12 w-12"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
                  {application.position}
                </h1>
                <StatusBadge status={application.status} />
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {company ? (
                  <Link
                    href={`/tracker/companies/${company.id}`}
                    className="font-medium text-gray-700 hover:text-[#ff5722]"
                  >
                    {company.name}
                  </Link>
                ) : (
                  "Sans entreprise"
                )}
                {" · "}
                {labelFor(JOB_TYPES, application.job_type)} ·{" "}
                {labelFor(JOB_DOMAINS, application.domain)} ·{" "}
                {labelFor(WORK_MODES, application.work_mode)}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                Candidature {formatDate(application.applied_at)} ·
                Canal {application.channel ? CHANNEL_LABELS[application.channel] ?? application.channel : "—"} ·
                Dernière interaction {formatRelativeTime(application.last_interaction_at)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="editorial-select h-8 w-52 text-xs"
              value={application.status}
              onChange={(event) => void handleStatusChange(event.target.value)}
            >
              {JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {JOB_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            {application.offer_url && (
              <a
                href={application.offer_url}
                target="_blank"
                rel="noreferrer"
                className="editorial-button-secondary h-8 px-3 text-xs"
              >
                Voir l&apos;offre
              </a>
            )}
            <button
              type="button"
              className="editorial-button-secondary h-8 px-3 text-xs"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-1.5 inline h-3.5 w-3.5" />
              Modifier
            </button>
            <button
              type="button"
              className="editorial-button-secondary h-8 px-3 text-xs text-red-600"
              onClick={() => void handleDelete()}
            >
              <Trash2 className="mr-1.5 inline h-3.5 w-3.5" />
              Supprimer
            </button>
          </div>
        </div>

        {showStatusNote && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">
              Changer le statut en « {JOB_STATUS_LABELS[pendingStatus as JobStatus]} » ?
            </p>
            <input
              className="editorial-input mt-2 w-full"
              placeholder="Note facultative (ex : suite à l'email du 12/10)"
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="editorial-button-primary h-8 px-3 text-xs"
                onClick={() => void confirmStatusChange()}
              >
                Confirmer
              </button>
              <button
                type="button"
                className="editorial-button-secondary h-8 px-3 text-xs"
                onClick={() => {
                  setShowStatusNote(false);
                  setPendingStatus("");
                  setStatusNote("");
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors",
              tab === item.id
                ? "border-[#ff5722] text-[#ff5722]"
                : "border-transparent text-gray-500 hover:text-gray-800",
            )}
            onClick={() => setTab(item.id)}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold text-gray-900">Informations du poste</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <InfoRow label="Intitulé" value={application.position} />
                <InfoRow label="Type" value={labelFor(JOB_TYPES, application.job_type)} />
                <InfoRow label="Domaine" value={labelFor(JOB_DOMAINS, application.domain)} />
                <InfoRow label="Localisation" value={application.location} />
                <InfoRow label="Mode de travail" value={labelFor(WORK_MODES, application.work_mode)} />
                <InfoRow label="Date de publication" value={formatDate(application.published_at)} />
                <InfoRow label="Date de candidature" value={formatDate(application.applied_at)} />
                <InfoRow label="Canal" value={application.channel ? CHANNEL_LABELS[application.channel] ?? application.channel : "—"} />
                <InfoRow label="Contact principal" value={application.primary_contact?.full_name} />
              </div>
              {application.description && (
                <div className="mt-4">
                  <p className="text-[11px] font-medium text-gray-400">Description de l&apos;offre</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">
                    {application.description}
                  </p>
                </div>
              )}
              {(application.offer_url || application.channel_url || application.channel_email || whatsappHref) && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                  {application.offer_url && (
                    <a href={application.offer_url} target="_blank" rel="noreferrer" className="editorial-button-secondary h-8 px-3 text-xs">
                      Page de l&apos;offre
                    </a>
                  )}
                  {application.channel_url && (
                    <a href={application.channel_url} target="_blank" rel="noreferrer" className="editorial-button-secondary h-8 px-3 text-xs">
                      Lien du canal
                    </a>
                  )}
                  {application.channel_email && (
                    <a href={`mailto:${application.channel_email}`} className="editorial-button-secondary h-8 px-3 text-xs">
                      <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                      {application.channel_email}
                    </a>
                  )}
                  {whatsappHref && (
                    <a href={whatsappHref} target="_blank" rel="noreferrer" className="editorial-button-secondary h-8 px-3 text-xs">
                      <MessageSquare className="mr-1.5 inline h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-gray-900">Actions rapides</h2>
                <div className="mt-3 space-y-2">
                  <button type="button" className="editorial-button-primary h-9 w-full text-xs" onClick={() => setInterviewOpen(true)}>
                    <CalendarClock className="mr-1.5 inline h-3.5 w-3.5" />
                    Programmer un entretien
                  </button>
                  <button type="button" className="editorial-button-secondary h-9 w-full text-xs" onClick={() => setFollowUpOpen(true)}>
                    <MessageSquare className="mr-1.5 inline h-3.5 w-3.5" />
                    Planifier une relance
                  </button>
                  <button type="button" className="editorial-button-secondary h-9 w-full text-xs" onClick={() => setContactOpen(true)}>
                    <User className="mr-1.5 inline h-3.5 w-3.5" />
                    Ajouter un contact
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-gray-900">Relances</h2>
                {followUps.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-400">Aucune relance programmée.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {followUps.map((followUp) => (
                      <div key={followUp.id} className="flex items-start justify-between gap-2 rounded-md border border-gray-100 p-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900">{formatDate(followUp.due_date)}</p>
                          <p className="truncate text-[11px] text-gray-500">
                            {FOLLOW_UP_STATUS_LABELS[followUp.status] ?? followUp.status}
                            {followUp.reason ? ` · ${followUp.reason}` : ""}
                          </p>
                        </div>
                        {followUp.status === "todo" && (
                          <button
                            type="button"
                            className="text-[11px] font-medium text-[#ff5722] hover:underline"
                            onClick={() => {
                              void completeFollowUp(followUp.id)
                                .then(() => {
                                  toast.success("Relance marquée comme effectuée.");
                                  return load();
                                })
                                .catch((error: unknown) =>
                                  toast.error(error instanceof Error ? error.message : "Unable to update."),
                                );
                            }}
                          >
                            Effectuée
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-gray-900">Historique des statuts</h2>
                <div className="mt-3 space-y-2">
                  {statusHistory.length === 0 && (
                    <p className="text-xs text-gray-400">Aucun changement enregistré.</p>
                  )}
                  {statusHistory.slice(0, 6).map((row) => (
                    <div key={row.id} className="text-xs">
                      <p className="font-medium text-gray-800">
                        {row.from_status ? JOB_STATUS_LABELS[row.from_status as JobStatus] ?? row.from_status : "Créée"}
                        {" → "}
                        {JOB_STATUS_LABELS[row.to_status as JobStatus] ?? row.to_status}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {formatDateTime(row.changed_at)}
                        {row.note ? ` · ${row.note}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "company" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900">Entreprise</h2>
              {company ? (
                <div className="mt-4">
                  <div className="flex items-center gap-3">
                    <CompanyLogo
                      name={company.name}
                      logoUrl={company.logo_url}
                      website={company.website}
                      className="h-11 w-11"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{company.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {[company.sector, company.location].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                  </div>
                  {company.description && (
                    <p className="mt-3 text-xs leading-relaxed text-gray-600">{company.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {company.website && (
                      <a href={company.website} target="_blank" rel="noreferrer" className="editorial-button-secondary h-8 px-3 text-xs">
                        Site officiel
                      </a>
                    )}
                    <Link href={`/tracker/companies/${company.id}`} className="editorial-button-secondary h-8 px-3 text-xs">
                      Voir la fiche complète
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-400">
                  Aucune entreprise associée. Modifiez la candidature pour en créer une.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Contacts</h2>
                <button type="button" className="editorial-button-secondary h-8 px-3 text-xs" onClick={() => setContactOpen(true)}>
                  <Plus className="mr-1 inline h-3.5 w-3.5" />
                  Ajouter
                </button>
              </div>
              {contacts.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-gray-400">
                  Aucun contact enregistré pour cette entreprise.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{contact.full_name}</p>
                          <p className="text-[11px] text-gray-500">{contact.role ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="editorial-icon-button" title="Envoyer un email">
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="editorial-icon-button" title="Appeler">
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact.linkedin_url && (
                            <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="editorial-icon-button" title="Profil LinkedIn">
                              <Link2 className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact.whatsapp && (
                            <a
                              href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="editorial-icon-button"
                              title="WhatsApp"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      {contact.notes && (
                        <p className="mt-1 text-[11px] text-gray-500">{contact.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold text-gray-900">Timeline des interactions</h2>
              <p className="text-xs text-gray-500">
                Collez un email, une réponse LinkedIn ou un message WhatsApp, puis enregistrez
                l&apos;interaction.
              </p>

              <form onSubmit={(event) => void handleLogEvent(event)} className="mt-4 rounded-md border border-gray-200 bg-gray-50/60 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="event-type">Type</label>
                    <select id="event-type" className="editorial-select w-full" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                      {EVENT_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="event-channel">Canal</label>
                    <select id="event-channel" className="editorial-select w-full" value={eventChannel} onChange={(e) => setEventChannel(e.target.value)}>
                      {APPLICATION_CHANNELS.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="event-date">Date et heure</label>
                    <input id="event-date" type="datetime-local" className="editorial-input w-full" value={eventOccurredAt} onChange={(e) => setEventOccurredAt(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="event-contact">Contact concerné</label>
                    <select id="event-contact" className="editorial-select w-full" value={eventContactId} onChange={(e) => setEventContactId(e.target.value)}>
                      <option value="">Aucun</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>{contact.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="editorial-label" htmlFor="event-summary">Résumé</label>
                    <input id="event-summary" className="editorial-input w-full" value={eventSummary} onChange={(e) => setEventSummary(e.target.value)} placeholder="Ex : relance envoyée au recruteur" />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="editorial-label" htmlFor="event-content">Contenu (email, message...)</label>
                    <textarea id="event-content" className="editorial-textarea min-h-[120px] w-full" value={eventContent} onChange={(e) => setEventContent(e.target.value)} placeholder="Collez ici le message échangé..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="event-link">Lien</label>
                    <input id="event-link" type="url" className="editorial-input w-full" value={eventLink} onChange={(e) => setEventLink(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="event-notes">Notes</label>
                    <input id="event-notes" className="editorial-input w-full" value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="editorial-button-primary mt-3 h-8 px-3 text-xs" disabled={savingEvent}>
                  {savingEvent ? "Enregistrement..." : "Enregistrer l'interaction"}
                </button>
              </form>

              <div className="mt-5 space-y-3">
                {events.length === 0 && (
                  <p className="py-6 text-center text-xs text-gray-400">Aucune interaction enregistrée.</p>
                )}
                {events.map((item) => (
                  <div key={item.id} className="relative border-l-2 border-gray-100 pl-4">
                    <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[#ff5722]" />
                    <div className="rounded-md border border-gray-100 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-900">
                            {EVENT_TYPE_LABELS[item.type] ?? item.type}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {formatDateTime(item.occurred_at)}
                            {item.contact?.full_name ? ` · ${item.contact.full_name}` : ""}
                            {item.channel ? ` · ${CHANNEL_LABELS[item.channel] ?? item.channel}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="text-gray-300 hover:text-red-500"
                          title="Supprimer"
                          onClick={() => {
                            void deleteEvent(item.id)
                              .then(() => load())
                              .catch(() => toast.error("Unable to delete."));
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {item.summary && <p className="mt-1.5 text-xs text-gray-700">{item.summary}</p>}
                      {item.content && (
                        <p className="mt-1.5 whitespace-pre-wrap rounded bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-600">
                          {item.content}
                        </p>
                      )}
                      {(item.link || item.notes) && (
                        <p className="mt-1.5 text-[11px] text-gray-500">
                          {item.link && (
                            <a href={item.link} target="_blank" rel="noreferrer" className="text-[#ff5722] hover:underline">
                              {item.link}
                            </a>
                          )}
                          {item.notes ? ` · ${item.notes}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900">Changements de statut</h2>
              <div className="mt-3 space-y-3">
                {statusHistory.length === 0 && (
                  <p className="text-xs text-gray-400">Aucun historique.</p>
                )}
                {statusHistory.map((row) => (
                  <div key={row.id} className="text-xs">
                    <p className="font-medium text-gray-800">
                      {JOB_STATUS_LABELS[row.to_status as JobStatus] ?? row.to_status}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {row.from_status
                        ? `Depuis ${JOB_STATUS_LABELS[row.from_status as JobStatus] ?? row.from_status} · `
                        : ""}
                      {formatDateTime(row.changed_at)}
                    </p>
                    {row.note && <p className="text-[11px] text-gray-500">{row.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "interviews" && (
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Entretiens</h2>
                <p className="text-xs text-gray-500">Préparation, questions, feedback et résultats.</p>
              </div>
              <button type="button" className="editorial-button-primary h-8 px-3 text-xs" onClick={() => setInterviewOpen(true)}>
                <Plus className="mr-1 inline h-3.5 w-3.5" />
                Programmer
              </button>
            </div>
            {interviews.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Aucun entretien"
                description="Programmez un entretien pour suivre les étapes du recrutement."
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {interviews.map((interview) => (
                  <div key={interview.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-gray-900">
                            {INTERVIEW_TYPE_LABELS[interview.type] ?? interview.type}
                          </p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                              INTERVIEW_STATUS_TONES[interview.status] ?? "bg-gray-100 text-gray-600",
                            )}
                          >
                            {INTERVIEW_STATUS_LABELS[interview.status] ?? interview.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          {formatDateTime(interview.scheduled_at)} ({interview.timezone ?? "UTC"}) ·{" "}
                          {INTERVIEW_FORMAT_LABELS[interview.format ?? ""] ?? interview.format ?? "—"}
                        </p>
                        {interview.interviewers && (
                          <p className="mt-1 text-[11px] text-gray-600">Interlocuteurs : {interview.interviewers}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {interview.meeting_url && (
                          <a href={interview.meeting_url} target="_blank" rel="noreferrer" className="editorial-button-secondary h-8 px-3 text-xs">
                            Rejoindre
                          </a>
                        )}
                        <select
                          className="editorial-select h-8 text-xs"
                          value={interview.status}
                          onChange={(event) => {
                            void updateInterview(interview.id, { status: event.target.value })
                              .then(() => {
                                toast.success("Entretien mis à jour.");
                                return load();
                              })
                              .catch((error: unknown) =>
                                toast.error(error instanceof Error ? error.message : "Unable to update."),
                              );
                          }}
                        >
                          <option value="scheduled">Prévu</option>
                          <option value="completed">Terminé</option>
                          <option value="postponed">Reporté</option>
                          <option value="cancelled">Annulé</option>
                        </select>
                      </div>
                    </div>
                    {(interview.prep_notes || interview.questions || interview.feedback || interview.result || interview.next_step) && (
                      <div className="mt-3 grid gap-3 rounded-md bg-gray-50 p-3 sm:grid-cols-2">
                        {interview.prep_notes && <InfoRow label="Préparation" value={interview.prep_notes} />}
                        {interview.questions && <InfoRow label="Questions posées" value={interview.questions} />}
                        {interview.feedback && <InfoRow label="Feedback" value={interview.feedback} />}
                        {interview.result && <InfoRow label="Résultat" value={interview.result} />}
                        {interview.next_step && <InfoRow label="Prochaine étape" value={interview.next_step} />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Notes personnelles</h2>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!noteContent.trim()) return;
                void addNote(application.id, noteContent)
                  .then(() => {
                    toast.success("Note enregistrée.");
                    setNoteContent("");
                    return load();
                  })
                  .catch((error: unknown) =>
                    toast.error(error instanceof Error ? error.message : "Unable to save the note."),
                  );
              }}
            >
              <input
                className="editorial-input w-full"
                placeholder="Écrire une note..."
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
              />
              <button type="submit" className="editorial-button-primary h-9 shrink-0 px-4 text-xs">
                Ajouter
              </button>
            </form>
            <div className="mt-4 space-y-2">
              {notes.length === 0 && (
                <p className="py-6 text-center text-xs text-gray-400">Aucune note pour le moment.</p>
              )}
              {notes.map((note) => (
                <div key={note.id} className="flex items-start justify-between gap-3 rounded-md border border-gray-100 p-3">
                  <div>
                    <p className="whitespace-pre-wrap text-xs text-gray-700">{note.content}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{formatDateTime(note.created_at)}</p>
                  </div>
                  <button
                    type="button"
                    className="text-gray-300 hover:text-red-500"
                    onClick={() => {
                      void deleteNote(note.id)
                        .then(() => load())
                        .catch(() => toast.error("Unable to delete."));
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "documents" && (
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Documents et liens</h2>
            <p className="text-xs text-gray-500">
              Référencez vos CV, lettres de motivation et autres documents (par leur URL ou leur
              emplacement).
            </p>
            <form
              className="mt-4 grid gap-3 sm:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!docName.trim()) {
                  toast.error("Indiquez un nom de document.");
                  return;
                }
                void addDocument({
                  application_id: application.id,
                  company_id: application.company_id,
                  name: docName.trim(),
                  doc_type: docType,
                  url: docUrl.trim() || null,
                  notes: docNotes.trim() || null,
                })
                  .then(() => {
                    toast.success("Document enregistré.");
                    setDocName("");
                    setDocUrl("");
                    setDocNotes("");
                    return load();
                  })
                  .catch((error: unknown) =>
                    toast.error(error instanceof Error ? error.message : "Unable to save."),
                  );
              }}
            >
              <input className="editorial-input" placeholder="Nom" value={docName} onChange={(e) => setDocName(e.target.value)} />
              <select className="editorial-select" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOCUMENT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <input className="editorial-input" type="url" placeholder="https://..." value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
              <button type="submit" className="editorial-button-primary h-9 text-xs">Ajouter</button>
              <input className="editorial-input sm:col-span-4" placeholder="Notes (optionnel)" value={docNotes} onChange={(e) => setDocNotes(e.target.value)} />
            </form>
            <div className="mt-4 divide-y divide-gray-100">
              {documents.length === 0 && (
                <p className="py-6 text-center text-xs text-gray-400">Aucun document référencé.</p>
              )}
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900">{doc.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {DOCUMENT_TYPE_LABELS[doc.doc_type ?? ""] ?? doc.doc_type ?? "—"}
                      {doc.notes ? ` · ${doc.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#ff5722] hover:underline">
                        Ouvrir
                      </a>
                    )}
                    <button
                      type="button"
                      className="text-gray-300 hover:text-red-500"
                      onClick={() => {
                        void deleteDocument(doc.id)
                          .then(() => load())
                          .catch(() => toast.error("Unable to delete."));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editOpen && (
        <ApplicationFormModal
          key={`edit-${application.id}`}
          open
          onClose={() => setEditOpen(false)}
          onSaved={() => void load()}
          editingApplication={application}
        />
      )}
      {interviewOpen && (
        <InterviewFormModal
          key={`interview-${application.id}`}
          open
          onClose={() => setInterviewOpen(false)}
          onSaved={() => void load()}
          applications={[application]}
          initialApplicationId={application.id}
        />
      )}
      {followUpOpen && (
        <FollowUpFormModal
          key={`followup-${application.id}`}
          open
          onClose={() => setFollowUpOpen(false)}
          onSaved={() => void load()}
          applications={[application]}
          initialApplicationId={application.id}
        />
      )}
      {contactOpen && (
        <ContactFormModal
          key={`contact-${application.company_id ?? "none"}`}
          open
          onClose={() => setContactOpen(false)}
          onSaved={() => void load()}
          companies={companies}
          initialCompanyId={application.company_id}
        />
      )}
    </div>
  );
}
