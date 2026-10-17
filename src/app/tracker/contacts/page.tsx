"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingBlock } from "@/components/tracker/Feedback";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import ContactFormModal from "@/components/tracker/ContactFormModal";
import EditorialSelect from "@/components/tracker/EditorialSelect";
import { formatRelativeTime } from "@/lib/tracker/format";
import { deleteContact, listCompanies, listContacts } from "@/lib/tracker/queries";
import type { CompanyRow, ContactRow } from "@/lib/tracker/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);

  const load = useCallback(async () => {
    try {
      const [contactRows, companyRows] = await Promise.all([listContacts(), listCompanies()]);
      setContacts(contactRows);
      setCompanies(companyRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load contacts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      const params = new URLSearchParams(window.location.search);
      if (params.get("add") === "1") {
        setEditing(null);
        setModalOpen(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (companyFilter !== "all" && contact.company_id !== companyFilter) return false;
      if (!term) return true;
      return [contact.full_name, contact.role, contact.email, contact.company?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [contacts, search, companyFilter]);

  const handleDelete = async (contact: ContactRow) => {
    if (!window.confirm(`Supprimer le contact ${contact.full_name} ?`)) return;
    try {
      await deleteContact(contact.id);
      toast.success("Contact supprimé.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete the contact.");
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <LoadingBlock label="Chargement des contacts..." />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Contacts</h1>
          <p className="mt-1 text-xs text-gray-500">
            {contacts.length} contact(s) · recruteurs, RH et interlocuteurs.
          </p>
        </div>
        <button
          type="button"
          className="editorial-button-primary h-8 px-3 text-xs"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <UserPlus className="mr-1.5 inline h-3.5 w-3.5" />
          Nouveau contact
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-5 py-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            className="editorial-input w-full pl-9"
            placeholder="Rechercher un contact..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <EditorialSelect
          className="editorial-select w-full sm:w-56"
          value={companyFilter}
          onChange={setCompanyFilter}
          options={[
            { value: "all", label: "Toutes les entreprises" },
            ...companies.map((company) => ({
              value: company.id,
              label: company.name,
            })),
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Users}
            title="Aucun contact"
            description="Enregistrez les recruteurs et interlocuteurs rencontrés pendant vos candidatures."
            action={
              <button
                type="button"
                className="editorial-button-primary mt-2 h-8 px-3 text-xs"
                onClick={() => setModalOpen(true)}
              >
                Ajouter un contact
              </button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-semibold text-gray-500">
                  <th className="px-5 py-2.5">Contact</th>
                  <th className="px-5 py-2.5">Entreprise</th>
                  <th className="px-5 py-2.5">Fonction</th>
                  <th className="px-5 py-2.5">Coordonnées</th>
                  <th className="px-5 py-2.5">Dernière interaction</th>
                  <th className="px-5 py-2.5">Prochaine action</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((contact) => (
                  <tr key={contact.id} className="transition-colors hover:bg-gray-50/80">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900">{contact.full_name}</p>
                      {contact.notes && (
                        <p className="max-w-xs truncate text-gray-500">{contact.notes}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {contact.company ? (
                        <Link
                          href={`/tracker/companies/${contact.company.id}`}
                          className="flex items-center gap-2 font-medium text-gray-800 hover:text-[#ff5722]"
                        >
                          <CompanyLogo
                            name={contact.company.name}
                            logoUrl={contact.company.logo_url}
                            className="h-6 w-6"
                          />
                          {contact.company.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{contact.role ?? "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="editorial-icon-button" title={contact.email}>
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="editorial-icon-button" title={contact.phone}>
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
                        {!contact.email && !contact.phone && !contact.linkedin_url && !contact.whatsapp && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {formatRelativeTime(contact.last_interaction_at)}
                    </td>
                    <td className="max-w-[180px] px-5 py-3 text-gray-600">
                      {contact.next_action ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="editorial-icon-button"
                          title="Modifier"
                          onClick={() => {
                            setEditing(contact);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="editorial-icon-button text-red-500"
                          title="Supprimer"
                          onClick={() => void handleDelete(contact)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <ContactFormModal
          key={editing?.id ?? "new-contact"}
          open
          onClose={() => setModalOpen(false)}
          onSaved={() => void load()}
          companies={companies}
          editingContact={editing}
        />
      )}
    </div>
  );
}
