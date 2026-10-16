"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingBlock } from "@/components/tracker/Feedback";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import StatusBadge from "@/components/tracker/StatusBadge";
import CompanyFormModal from "@/components/tracker/CompanyFormModal";
import ApplicationFormModal from "@/components/tracker/ApplicationFormModal";
import ContactFormModal from "@/components/tracker/ContactFormModal";
import { CHANNEL_LABELS, INTERVIEW_TYPE_LABELS } from "@/lib/tracker/constants";
import { formatDate, formatDateTime } from "@/lib/tracker/format";
import {
  getCompany,
  listApplications,
  listContacts,
  listInterviews,
  updateCompany,
} from "@/lib/tracker/queries";
import type { CompanyRow, ContactRow, InterviewRow, JobApplicationRow } from "@/lib/tracker/types";

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params.id;

  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    try {
      const [companyRow, applicationRows, contactRows, interviewRows] = await Promise.all([
        getCompany(companyId),
        listApplications({ companyId }),
        listContacts(companyId),
        listInterviews(),
      ]);
      if (!companyRow) {
        toast.error("Entreprise introuvable.");
        router.push("/tracker/companies");
        return;
      }
      setCompany(companyRow);
      setNotes(companyRow.notes ?? "");
      setApplications(applicationRows);
      setContacts(contactRows);
      const appIds = new Set(applicationRows.map((app) => app.id));
      setInterviews(interviewRows.filter((row) => appIds.has(row.application_id)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load the company.");
    } finally {
      setLoading(false);
    }
  }, [companyId, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const saveNotes = async () => {
    if (!company) return;
    setSavingNotes(true);
    try {
      const updated = await updateCompany(company.id, { notes: notes.trim() || null });
      setCompany(updated);
      toast.success("Notes enregistrées.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <LoadingBlock label="Chargement de l'entreprise..." />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="page-shell">
      <Link
        href="/tracker/companies"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour aux entreprises
      </Link>

      <div className="mt-3 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <CompanyLogo
              name={company.name}
              logoUrl={company.logo_url}
              domain={company.domain}
              website={company.website}
              className="h-14 w-14"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
                {company.name}
              </h1>
              <p className="mt-0.5 text-xs text-gray-500">
                {[company.sector, company.location].filter(Boolean).join(" · ") || "—"}
              </p>
              {company.description && (
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-600">
                  {company.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="editorial-button-secondary h-8 px-3 text-xs"
                  >
                    <ExternalLink className="mr-1.5 inline h-3.5 w-3.5" />
                    Site officiel
                  </a>
                )}
                <button
                  type="button"
                  className="editorial-button-primary h-8 px-3 text-xs"
                  onClick={() => setApplicationOpen(true)}
                >
                  <Plus className="mr-1.5 inline h-3.5 w-3.5" />
                  Nouvelle candidature
                </button>
                <button
                  type="button"
                  className="editorial-button-secondary h-8 px-3 text-xs"
                  onClick={() => setContactOpen(true)}
                >
                  <UserPlus className="mr-1.5 inline h-3.5 w-3.5" />
                  Ajouter un contact
                </button>
                <button
                  type="button"
                  className="editorial-button-secondary h-8 px-3 text-xs"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="mr-1.5 inline h-3.5 w-3.5" />
                  Modifier
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div className="rounded-md bg-gray-50 px-4 py-2">
              <p className="text-lg font-bold text-gray-900">{applications.length}</p>
              <p className="text-[10px] text-gray-500">candidatures</p>
            </div>
            <div className="rounded-md bg-gray-50 px-4 py-2">
              <p className="text-lg font-bold text-gray-900">{contacts.length}</p>
              <p className="text-[10px] text-gray-500">contacts</p>
            </div>
            <div className="rounded-md bg-gray-50 px-4 py-2">
              <p className="text-lg font-bold text-gray-900">{interviews.length}</p>
              <p className="text-[10px] text-gray-500">entretiens</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white lg:col-span-2">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Candidatures associées</h2>
          </div>
          {applications.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Aucune candidature"
              description="Créez une candidature pour cette entreprise afin de suivre son processus de recrutement."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {applications.map((app) => (
                <Link
                  key={app.id}
                  href={`/tracker/applications/${app.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-gray-50/80"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900">{app.position}</p>
                    <p className="text-[11px] text-gray-500">
                      {formatDate(app.applied_at)} ·{" "}
                      {app.channel ? CHANNEL_LABELS[app.channel] ?? app.channel : "—"}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Contacts</h2>
            </div>
            {contacts.length === 0 ? (
              <p className="px-5 py-6 text-center text-xs text-gray-400">Aucun contact.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <div key={contact.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-gray-900">
                          {contact.full_name}
                        </p>
                        <p className="text-[11px] text-gray-500">{contact.role ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="editorial-icon-button" title="Email">
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="editorial-icon-button" title="Appeler">
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {contact.linkedin_url && (
                          <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="editorial-icon-button" title="LinkedIn">
                            <ExternalLink className="h-3.5 w-3.5" />
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
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Entretiens</h2>
            {interviews.length === 0 ? (
              <p className="mt-2 text-xs text-gray-400">Aucun entretien enregistré.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {interviews.slice(0, 5).map((interview) => (
                  <div key={interview.id} className="rounded-md border border-gray-100 p-2.5">
                    <p className="text-xs font-semibold text-gray-900">
                      {INTERVIEW_TYPE_LABELS[interview.type] ?? interview.type}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {formatDateTime(interview.scheduled_at)} ·{" "}
                      {applications.find((app) => app.id === interview.application_id)?.position}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Notes personnelles</h2>
            <textarea
              className="editorial-textarea mt-3 min-h-[100px] w-full"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Informations utiles sur l'entreprise..."
            />
            <button
              type="button"
              className="editorial-button-primary mt-2 h-8 px-3 text-xs"
              disabled={savingNotes}
              onClick={() => void saveNotes()}
            >
              {savingNotes ? "Enregistrement..." : "Enregistrer les notes"}
            </button>
          </div>
        </div>
      </div>

      {editOpen && (
        <CompanyFormModal
          key={`edit-${company.id}`}
          open
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setCompany(updated)}
          editingCompany={company}
        />
      )}
      {applicationOpen && (
        <ApplicationFormModal
          key={`new-application-${company.id}`}
          open
          onClose={() => setApplicationOpen(false)}
          onSaved={() => void load()}
          prefillCompany={company}
        />
      )}
      {contactOpen && (
        <ContactFormModal
          key={`new-contact-${company.id}`}
          open
          onClose={() => setContactOpen(false)}
          onSaved={() => void load()}
          companies={[company]}
          initialCompanyId={company.id}
        />
      )}
    </div>
  );
}
