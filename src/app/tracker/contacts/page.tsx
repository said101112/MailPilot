"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingBlock } from "@/components/tracker/Feedback";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import ContactFormModal from "@/components/tracker/ContactFormModal";
import ExportContactsModal from "@/components/tracker/ExportContactsModal";
import EditorialSelect from "@/components/tracker/EditorialSelect";
import { formatRelativeTime } from "@/lib/tracker/format";
import { deleteContact, listCompanies, listContacts } from "@/lib/tracker/queries";
import type { CompanyRow, ContactRow } from "@/lib/tracker/types";
import {
  COUNTRY_OPTIONS,
  getCountryBadge,
  resolveCountryCategory,
  type CountryCategory,
} from "@/lib/tracker/countries";
import { syncSaudiDirectory } from "@/lib/tracker/saudiDirectory";
import { cn } from "@/lib/utils";

const roleOptions = [
  { value: "all", label: "Toutes les fonctions" },
  { value: "recruiter", label: "Recrutement & RH" },
  { value: "tech", label: "Tech & Ingénierie" },
  { value: "management", label: "Direction & Management" },
  { value: "other", label: "Autres fonctions" },
];

const sortOptions = [
  { value: "recent", label: "Plus récents d'abord" },
  { value: "name_asc", label: "Nom (A → Z)" },
  { value: "name_desc", label: "Nom (Z → A)" },
  { value: "company_asc", label: "Entreprise (A → Z)" },
  { value: "interaction", label: "Dernière interaction" },
];

const pageSizeOptions = [
  { value: "10", label: "10 / page" },
  { value: "25", label: "25 / page" },
  { value: "50", label: "50 / page" },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSaudi, setSyncingSaudi] = useState(false);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
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

      // Check if automatic Saudi directory synchronization is needed on first visit
      const synced = localStorage.getItem("tracker_saudi_contacts_synced_v2");
      if (!synced) {
        void syncSaudiDirectory()
          .then((res) => {
            localStorage.setItem("tracker_saudi_contacts_synced_v2", "true");
            if (res.createdContacts > 0 || res.updatedCompanies > 0) {
              void load();
            }
          })
          .catch(() => undefined);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleSyncSaudi = async () => {
    setSyncingSaudi(true);
    try {
      const res = await syncSaudiDirectory();
      toast.success(
        `Annuaire Arabie Saoudite synchronisé : ${res.createdCompanies + res.updatedCompanies} entreprise(s), ${res.createdContacts + res.updatedContacts} contact(s).`
      );
      localStorage.setItem("tracker_saudi_contacts_synced_v2", "true");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la synchronisation.");
    } finally {
      setSyncingSaudi(false);
    }
  };

  const companyOptions = useMemo(() => {
    const list = [
      { value: "all", label: "Toutes les entreprises" },
      { value: "with_company", label: "Avec entreprise rattachée" },
      { value: "without_company", label: "Sans entreprise" },
    ];
    const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name));
    for (const c of sorted) {
      list.push({ value: c.id, label: c.name });
    }
    return list;
  }, [companies]);

  const isFiltered =
    search.trim() !== "" ||
    companyFilter !== "all" ||
    roleFilter !== "all" ||
    countryFilter !== "all" ||
    sortBy !== "recent";

  const handleResetFilters = () => {
    setSearch("");
    setCompanyFilter("all");
    setRoleFilter("all");
    setCountryFilter("all");
    setSortBy("recent");
    setPage(1);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = contacts.filter((contact) => {
      // 1. Company filter
      if (companyFilter === "with_company" && !contact.company_id) return false;
      if (companyFilter === "without_company" && Boolean(contact.company_id)) return false;
      if (
        companyFilter !== "all" &&
        companyFilter !== "with_company" &&
        companyFilter !== "without_company" &&
        contact.company_id !== companyFilter
      ) {
        return false;
      }

      // 2. Country Category filter (Saudi, Maroc, France, Other, non_saudi)
      if (countryFilter !== "all") {
        const detected = resolveCountryCategory(
          contact.company?.location,
          contact.email || contact.company?.name
        );
        if (countryFilter === "non_saudi") {
          if (detected === "saudi") return false;
        } else if (detected !== countryFilter) {
          return false;
        }
      }

      // 3. Role filter
      if (roleFilter !== "all") {
        const roleLower = (contact.role || "").toLowerCase();
        if (roleFilter === "recruiter") {
          const isRecruiter = /recrut|rh\b|hr\b|talent|sourc|headhunt/.test(roleLower);
          if (!isRecruiter) return false;
        } else if (roleFilter === "tech") {
          const isTech =
            /dev|tech|ingén|engin|lead|architect|data|cto|fullstack|software|backend|frontend/.test(
              roleLower,
            );
          if (!isTech) return false;
        } else if (roleFilter === "management") {
          const isMgmt = /ceo|co-founder|fondat|direct|head|vp|manag|responsable/.test(roleLower);
          if (!isMgmt) return false;
        } else if (roleFilter === "other") {
          const isKnown =
            /recrut|rh\b|hr\b|talent|sourc|headhunt|dev|tech|ingén|engin|lead|architect|data|cto|fullstack|software|backend|frontend|ceo|co-founder|fondat|direct|head|vp|manag|responsable/.test(
              roleLower,
            );
          if (isKnown) return false;
        }
      }

      // 4. Search query
      if (!term) return true;
      return [
        contact.full_name,
        contact.role,
        contact.email,
        contact.phone,
        contact.whatsapp,
        contact.notes,
        contact.next_action,
        contact.company?.name,
        contact.company?.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });

    return [...result].sort((a, b) => {
      if (sortBy === "name_asc") {
        return (a.full_name || "").localeCompare(b.full_name || "");
      }
      if (sortBy === "name_desc") {
        return (b.full_name || "").localeCompare(a.full_name || "");
      }
      if (sortBy === "company_asc") {
        const compA = a.company?.name || "";
        const compB = b.company?.name || "";
        if (!compA && compB) return 1;
        if (compA && !compB) return -1;
        return compA.localeCompare(compB);
      }
      if (sortBy === "interaction") {
        const timeA = a.last_interaction_at ? new Date(a.last_interaction_at).getTime() : 0;
        const timeB = b.last_interaction_at ? new Date(b.last_interaction_at).getTime() : 0;
        return timeB - timeA;
      }
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [contacts, search, companyFilter, countryFilter, roleFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

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
            {contacts.length} contact(s) · recruteurs, RH et interlocuteurs catégorisés par pays.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={syncingSaudi}
            className="editorial-button-secondary h-8 px-3 text-xs flex items-center gap-1.5"
            onClick={handleSyncSaudi}
            title="Attacher et catégoriser les 60 emails d'Arabie Saoudite"
          >
            <span className="text-sm leading-none">🇸🇦</span>
            <span>{syncingSaudi ? "Synchronisation..." : "Attacher contacts Saudi (60)"}</span>
          </button>
          <button
            type="button"
            className="editorial-button-secondary h-8 px-3 text-xs flex items-center gap-1.5"
            onClick={() => setExportModalOpen(true)}
            title="Exporter les contacts en CSV (Emails & Entreprises)"
          >
            <Download className="h-3.5 w-3.5 text-gray-600" />
            <span>Exporter CSV</span>
          </button>
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
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-5 rounded-lg border border-gray-200 bg-white p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              className="editorial-input w-full pl-9 pr-8 text-xs"
              placeholder="Rechercher nom, email, rôle..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Country Category Filter (Saudi, Maroc, France, Other) */}
          <EditorialSelect
            className="editorial-select w-full text-xs"
            value={countryFilter}
            onChange={(val) => {
              setCountryFilter(val);
              setPage(1);
            }}
            options={COUNTRY_OPTIONS}
          />

          {/* Company Filter */}
          <EditorialSelect
            className="editorial-select w-full text-xs"
            value={companyFilter}
            onChange={(val) => {
              setCompanyFilter(val);
              setPage(1);
            }}
            options={companyOptions}
          />

          {/* Role Filter */}
          <EditorialSelect
            className="editorial-select w-full text-xs"
            value={roleFilter}
            onChange={(val) => {
              setRoleFilter(val);
              setPage(1);
            }}
            options={roleOptions}
          />

          {/* Sort By */}
          <EditorialSelect
            className="editorial-select w-full text-xs"
            value={sortBy}
            onChange={(val) => {
              setSortBy(val);
              setPage(1);
            }}
            options={sortOptions}
          />
        </div>

        {/* Filter status & Reset button */}
        {isFiltered && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">
              Filtres actifs :{" "}
              <span className="font-medium text-gray-800">
                {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
              </span>{" "}
              sur {contacts.length}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#ff5722] transition-colors"
              onClick={handleResetFilters}
            >
              <RotateCcw className="h-3 w-3" />
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Users}
            title={contacts.length === 0 ? "Aucun contact" : "Aucun résultat trouvé"}
            description={
              contacts.length === 0
                ? "Enregistrez les recruteurs et interlocuteurs rencontrés pendant vos candidatures."
                : "Aucun contact ne correspond à vos critères de recherche ou de filtre."
            }
            action={
              contacts.length === 0 ? (
                <button
                  type="button"
                  className="editorial-button-primary mt-2 h-8 px-3 text-xs"
                  onClick={() => setModalOpen(true)}
                >
                  Ajouter un contact
                </button>
              ) : (
                <button
                  type="button"
                  className="editorial-button-secondary mt-2 h-8 px-3 text-xs"
                  onClick={handleResetFilters}
                >
                  Réinitialiser les filtres
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-semibold text-gray-500">
                  <th className="px-5 py-2.5">Contact</th>
                  <th className="px-5 py-2.5">Entreprise & Pays</th>
                  <th className="px-5 py-2.5">Fonction</th>
                  <th className="px-5 py-2.5">Coordonnées</th>
                  <th className="px-5 py-2.5">Dernière interaction</th>
                  <th className="px-5 py-2.5">Prochaine action</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((contact) => {
                  const country = resolveCountryCategory(
                    contact.company?.location,
                    contact.email || contact.company?.name
                  );
                  const countryBadge = getCountryBadge(country);

                  return (
                    <tr key={contact.id} className="transition-colors hover:bg-gray-50/80">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-900">{contact.full_name}</p>
                        {contact.notes && (
                          <p className="max-w-xs truncate text-gray-500">{contact.notes}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {contact.company ? (
                          <div className="flex flex-col gap-1 items-start">
                            <Link
                              href={`/tracker/companies/${contact.company.id}`}
                              className="flex items-center gap-2 font-medium text-gray-800 hover:text-[#ff5722]"
                            >
                              <CompanyLogo
                                name={contact.company.name}
                                logoUrl={contact.company.logo_url}
                                className="h-5 w-5"
                              />
                              <span className="font-medium text-gray-900">{contact.company.name}</span>
                            </Link>
                            {countryBadge && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border",
                                  countryBadge.badgeClass
                                )}
                              >
                                <span>{countryBadge.flag}</span>
                                <span>{countryBadge.name}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{contact.role ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="editorial-icon-button"
                              title={contact.email}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="editorial-icon-button"
                              title={contact.phone}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact.linkedin_url && (
                            <a
                              href={contact.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="editorial-icon-button"
                              title="LinkedIn"
                            >
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
                          {!contact.email &&
                            !contact.phone &&
                            !contact.linkedin_url &&
                            !contact.whatsapp && <span className="text-gray-400">—</span>}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (Shown on mobile screens < md) */}
          <div className="md:hidden divide-y divide-gray-100">
            {paginated.map((contact) => {
              const country = resolveCountryCategory(
                contact.company?.location,
                contact.email || contact.company?.name
              );
              const countryBadge = getCountryBadge(country);

              return (
                <div key={contact.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-gray-900">{contact.full_name}</p>
                      <p className="text-[11px] text-gray-500">
                        {contact.role ?? "Contact recruteur"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        className="editorial-icon-button h-7 w-7"
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
                        className="editorial-icon-button h-7 w-7 text-red-500"
                        title="Supprimer"
                        onClick={() => void handleDelete(contact)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {contact.company && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/tracker/companies/${contact.company.id}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-[#ff5722]"
                      >
                        <CompanyLogo
                          name={contact.company.name}
                          logoUrl={contact.company.logo_url}
                          className="h-4 w-4 shrink-0"
                        />
                        <span className="truncate">{contact.company.name}</span>
                      </Link>
                      {countryBadge && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[10px] font-medium border",
                            countryBadge.badgeClass
                          )}
                        >
                          <span>{countryBadge.flag}</span>
                          <span>{countryBadge.name}</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-gray-50 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="editorial-icon-button h-7 w-7"
                          title={contact.email}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="editorial-icon-button h-7 w-7"
                          title={contact.phone}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {contact.linkedin_url && (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="editorial-icon-button h-7 w-7"
                          title="LinkedIn"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {contact.whatsapp && (
                        <a
                          href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="editorial-icon-button h-7 w-7"
                          title="WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    {contact.next_action && (
                      <span className="text-[10.5px] text-amber-600 font-medium truncate max-w-[140px]">
                        {contact.next_action}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Affichage de{" "}
                  <span className="font-semibold text-gray-800">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  à{" "}
                  <span className="font-semibold text-gray-800">
                    {Math.min(currentPage * pageSize, filtered.length)}
                  </span>{" "}
                  sur <span className="font-semibold text-gray-800">{filtered.length}</span>{" "}
                  contact{filtered.length > 1 ? "s" : ""}
                </span>
                <div className="w-28">
                  <EditorialSelect
                    className="editorial-select h-7 text-xs"
                    value={String(pageSize)}
                    onChange={(val) => {
                      setPageSize(Number(val));
                      setPage(1);
                    }}
                    options={pageSizeOptions}
                  />
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    className="editorial-button-secondary h-7 px-2 text-xs disabled:opacity-40 cursor-pointer"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:mr-0.5" />
                    <span className="hidden sm:inline">Précédent</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, index, array) => {
                        const prev = array[index - 1];
                        return (
                          <div key={p} className="flex items-center">
                            {prev && p - prev > 1 && (
                              <span className="px-1 text-gray-400">...</span>
                            )}
                            <button
                              type="button"
                              className={cn(
                                "h-7 min-w-7 rounded-md px-2 text-xs font-semibold transition cursor-pointer",
                                currentPage === p
                                  ? "bg-[#ff5722] text-white"
                                  : "text-gray-600 hover:bg-gray-100",
                              )}
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    className="editorial-button-secondary h-7 px-2 text-xs disabled:opacity-40 cursor-pointer"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <span className="hidden sm:inline">Suivant</span>
                    <ChevronRight className="h-3.5 w-3.5 sm:ml-0.5" />
                  </button>
                </div>
              )}
            </div>
          )}
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

      {exportModalOpen && (
        <ExportContactsModal
          open
          onClose={() => setExportModalOpen(false)}
          contacts={contacts}
          filteredContacts={filtered}
          isFiltered={isFiltered}
        />
      )}
    </div>
  );
}
