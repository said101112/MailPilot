"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  Edit3,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  RotateCcw,
  Send,
  Sparkles,
  TriangleAlert,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PROFILE_DEFAULT_NAME } from "@/lib/brand";
import {
  getIntegrationStatus,
  sendApplication,
  validateEmailBeforeSend,
  type EmailPreflightResult,
  type IntegrationStatusResponse,
} from "@/lib/api";
import { validateEmailFormat } from "@/lib/email";
import {
  cloneDefaultTemplates,
  DEFAULT_TEMPLATES,
  TEMPLATE_LIBRARY_EVENT,
  getStoredTemplates,
} from "@/lib/templates";
import {
  syncEmailDispatchToTracker,
  inferCompanyFromEmail,
  getWithdrawnEmails,
} from "@/lib/tracker/syncService";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { readStoredCv } from "@/lib/workspace";
import CvUploadCard from "@/components/CvUploadCard";

interface DuplicateMatch {
  company: string;
  position: string;
  date: string;
  daysAgo: number;
  status: string;
}

export default function ApplyPage() {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState(cloneDefaultTemplates);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailCheck, setEmailCheck] = useState<EmailPreflightResult>(() =>
    validateEmailFormat(""),
  );
  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [integrationStatus, setIntegrationStatus] =
    useState<IntegrationStatusResponse | null>(null);
    
  const [email, setEmail] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_TEMPLATES[0].id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomized, setIsCustomized] = useState(false);
  const [customSubject, setCustomSubject] = useState(DEFAULT_TEMPLATES[0].subject);
  const [customMessage, setCustomMessage] = useState(DEFAULT_TEMPLATES[0].message);
  const [tempSubject, setTempSubject] = useState(DEFAULT_TEMPLATES[0].subject);
  const [tempMessage, setTempMessage] = useState(DEFAULT_TEMPLATES[0].message);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Duplicate detection state
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatch | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  useEffect(() => {
    const syncInitialState = () => {
      const nextTemplates = getStoredTemplates();
      setTemplates(nextTemplates);
      const initialTpl = nextTemplates[0] ?? DEFAULT_TEMPLATES[0];
      setSelectedTemplateId(initialTpl.id);
      setCustomSubject(initialTpl.subject);
      setCustomMessage(initialTpl.message);
      setTempSubject(initialTpl.subject);
      setTempMessage(initialTpl.message);
    };

    const syncTemplates = () => {
      const nextTemplates = getStoredTemplates();
      setTemplates(nextTemplates);
      setSelectedTemplateId((previousId) => {
        const nextTemplate =
          nextTemplates.find((item) => item.id === previousId) ??
          nextTemplates[0] ??
          DEFAULT_TEMPLATES[0];
        return nextTemplate.id;
      });
    };

    syncInitialState();

    window.addEventListener(TEMPLATE_LIBRARY_EVENT, syncTemplates);
    window.addEventListener("storage", syncTemplates);

    return () => {
      window.removeEventListener(TEMPLATE_LIBRARY_EVENT, syncTemplates);
      window.removeEventListener("storage", syncTemplates);
    };
  }, []);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsDropdownOpen(false);
    const chosen = templates.find((t) => t.id === templateId) || DEFAULT_TEMPLATES[0];
    if (chosen) {
      setCustomSubject(chosen.subject);
      setCustomMessage(chosen.message);
      setTempSubject(chosen.subject);
      setTempMessage(chosen.message);
      setIsCustomized(false);
    }
  };

  const handleOpenCustomModal = () => {
    const current = templates.find((t) => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];
    setTempSubject(isCustomized ? customSubject : (customSubject || current.subject));
    setTempMessage(isCustomized ? customMessage : (customMessage || current.message));
    setIsModalOpen(true);
  };

  const handleSaveCustomization = () => {
    if (!tempSubject.trim()) {
      toast.error("L'objet de l'email ne peut pas être vide.");
      return;
    }
    setCustomSubject(tempSubject.trim());
    setCustomMessage(tempMessage);
    setIsCustomized(true);
    setIsModalOpen(false);
    toast.success("Email personnalisé pour cette candidature !");
  };

  const handleResetInModal = () => {
    const current = templates.find((t) => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];
    if (current) {
      setTempSubject(current.subject);
      setTempMessage(current.message);
      toast.info("Champs réinitialisés avec le modèle par défaut.");
    }
  };

  const handleCancelCustomization = () => {
    const current = templates.find((t) => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];
    setCustomSubject(current.subject);
    setCustomMessage(current.message);
    setTempSubject(current.subject);
    setTempMessage(current.message);
    setIsCustomized(false);
    toast.info("Personnalisation annulée (modèle d'origine actif).");
  };

  useEffect(() => {
    const loadIntegrationStatus = async () => {
      setIntegrationLoading(true);
      try {
        const nextStatus = await getIntegrationStatus();
        setIntegrationStatus(nextStatus);
      } catch {
        toast.error("Unable to load integration status.");
      } finally {
        setIntegrationLoading(false);
      }
    };

    void loadIntegrationStatus();
  }, []);

  const n8nBlocked =
    integrationStatus?.n8n.configured === false ||
    integrationStatus?.n8n.reachable === false ||
    integrationStatus?.n8n.healthy === false;

  const sendDisabled =
    loading ||
    integrationLoading ||
    emailChecking ||
    !email ||
    !emailCheck.valid ||
    Boolean(n8nBlocked);

  const checkDuplicates = async (emailVal: string) => {
    const cleanEmail = emailVal.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setDuplicateMatch(null);
      return;
    }

    setCheckingDuplicate(true);
    try {
      // 1. Check in applications table
      const { data: appData } = await supabase
        .from("applications")
        .select("id, company, position, email, status, created_at")
        .ilike("email", cleanEmail)
        .order("created_at", { ascending: false })
        .limit(1);

      if (appData && appData.length > 0) {
        const match = appData[0];
        const createdDate = new Date(match.created_at);
        const diffTime = Math.abs(Date.now() - createdDate.getTime());
        const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        setDuplicateMatch({
          company: match.company || "Entreprise inconnue",
          position: match.position || "Stage / Emploi",
          date: createdDate.toLocaleDateString("fr-FR"),
          daysAgo,
          status: match.status || "envoyé",
        });
        return;
      }

      // 2. Check in job_applications (tracker)
      const { data: trackerData } = await supabase
        .from("job_applications")
        .select("id, position, status, created_at, applied_at, company:companies(name)")
        .ilike("channel_email", cleanEmail)
        .order("created_at", { ascending: false })
        .limit(1);

      if (trackerData && trackerData.length > 0) {
        const match = trackerData[0];
        const dateRef = match.applied_at || match.created_at;
        const createdDate = new Date(dateRef);
        const diffTime = Math.abs(Date.now() - createdDate.getTime());
        const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const compName = (match.company as any)?.name || "Entreprise inconnue";
        setDuplicateMatch({
          company: compName,
          position: match.position || "Stage / Emploi",
          date: createdDate.toLocaleDateString("fr-FR"),
          daysAgo,
          status: match.status || "envoyé",
        });
        return;
      }

      // 3. Check by company inferred from email domain
      const inferred = inferCompanyFromEmail(cleanEmail);
      if (inferred?.name) {
        const { data: compMatches } = await supabase
          .from("job_applications")
          .select("id, position, status, created_at, applied_at, company:companies!inner(name)")
          .ilike("companies.name", `%${inferred.name}%`)
          .order("created_at", { ascending: false })
          .limit(1);

        if (compMatches && compMatches.length > 0) {
          const match = compMatches[0];
          const dateRef = match.applied_at || match.created_at;
          const createdDate = new Date(dateRef);
          const diffTime = Math.abs(Date.now() - createdDate.getTime());
          const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const compName = (match.company as any)?.name || inferred.name;
          setDuplicateMatch({
            company: compName,
            position: match.position || "Stage / Emploi",
            date: createdDate.toLocaleDateString("fr-FR"),
            daysAgo,
            status: match.status || "envoyé",
          });
          return;
        }
      }

      setDuplicateMatch(null);
    } catch (err) {
      console.warn("Duplicate check error:", err);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const handleOpenGmailWeb = async () => {
    if (!email || !emailCheck.valid) {
      toast.error("Veuillez saisir une adresse email valide.");
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];
    const rawSubject = isCustomized ? (customSubject.trim() || template.subject) : template.subject;
    const rawMessage = isCustomized ? (customMessage.trim() || template.message) : template.message;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const candidateName =
      user?.user_metadata?.full_name || user?.email?.split("@")[0] || PROFILE_DEFAULT_NAME;
    const formattedName = candidateName.charAt(0).toUpperCase() + candidateName.slice(1);

    const inferred = inferCompanyFromEmail(email);
    const companyToSave = inferred?.name || null;
    const companyDisplayName = companyToSave || "your company";

    const replaceTags = (text: string) =>
      text
        .replace(/in the \[Position\] role/gi, "in the open position")
        .replace(/\[Position\] role/gi, "open position")
        .replace(/\[Position\]/g, "open position")
        .replace(/\{position\}/gi, "open position")
        .replace(/\[Company\]/g, companyDisplayName)
        .replace(/\{company\}/gi, companyDisplayName)
        .replace(/\[MyName\]/g, formattedName)
        .replace(/\{name\}/gi, formattedName)
        .replace(/\[HR Name\]/g, "Hiring Manager");

    const processedSubject = replaceTags(rawSubject);
    const processedMessage = replaceTags(rawMessage);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}&su=${encodeURIComponent(processedSubject)}&body=${encodeURIComponent(processedMessage)}`;

    window.open(gmailUrl, "_blank", "noopener,noreferrer");
    toast.success("Onglet Gmail ouvert avec l'email pré-rempli ! N'oubliez pas d'attacher votre CV.");

    try {
      if (user) {
        await supabase.from("applications").insert([
          {
            user_id: user.id,
            company: companyToSave,
            position: "Stage PFE / Emploi",
            email: email,
            status: "success",
          },
        ]);
      }
      await syncEmailDispatchToTracker({
        company: companyToSave,
        position: "Stage PFE / Emploi",
        email: email,
        status: "success",
      });
    } catch (syncErr) {
      console.warn("Tracker sync error:", syncErr);
    }
  };

  const runEmailPreflight = async (emailValue = email) => {
    const formatResult = validateEmailFormat(emailValue);
    setEmailCheck(formatResult);

    if (!formatResult.valid) {
      return formatResult;
    }

    const cleanEmail = emailValue.trim().toLowerCase();
    const withdrawnSet = await getWithdrawnEmails();
    if (withdrawnSet.has(cleanEmail)) {
      const withdrawnResult: EmailPreflightResult = {
        valid: false,
        code: "domain_not_found",
        message: "Cet email est marqué comme retiré / non délivré dans votre historique (bloqué pour éviter un bounce).",
      };
      setEmailCheck(withdrawnResult);
      return withdrawnResult;
    }

    setEmailChecking(true);

    try {
      const result = await validateEmailBeforeSend(emailValue);
      setEmailCheck(result);
      return result;
    } catch {
      const fallbackResult: EmailPreflightResult = {
        valid: false,
        code: "domain_not_found",
        message: "Unable to validate the email.",
      };
      setEmailCheck(fallbackResult);
      return fallbackResult;
    } finally {
      setEmailChecking(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);

    try {
      if (integrationLoading) {
        throw new Error("Checking workflow health. Please try again in a moment.");
      }

      const emailResult = await runEmailPreflight();
      if (!emailResult.valid) {
        throw new Error(emailResult.message);
      }

      if (n8nBlocked) {
        throw new Error(integrationStatus?.n8n.message || "n8n is not ready.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User is not authenticated.");
      }

      const template = templates.find((t) => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];
      const { base64: cvBase64, fileName: cvFileName } = readStoredCv();

      const candidateName =
        user.user_metadata?.full_name || user.email?.split("@")[0] || PROFILE_DEFAULT_NAME;
      const formattedName = candidateName.charAt(0).toUpperCase() + candidateName.slice(1);

      const inferred = inferCompanyFromEmail(email);
      const companyToSave = inferred?.name || null;
      const companyDisplayName = companyToSave || "your company";

      // Replace generic tags with clean phrasing
      const replace = (text: string) =>
        text
          .replace(/in the \[Position\] role/gi, "in the open position")
          .replace(/\[Position\] role/gi, "open position")
          .replace(/\[Position\]/g, "open position")
          .replace(/\{position\}/gi, "open position")
          .replace(/\[Company\]/g, companyDisplayName)
          .replace(/\{company\}/gi, companyDisplayName)
          .replace(/\[MyName\]/g, formattedName)
          .replace(/\{name\}/gi, formattedName)
          .replace(/\[HR Name\]/g, "Hiring Manager");

      const finalSubject = isCustomized
        ? (customSubject.trim() || template.subject).trim()
        : template.subject;
      const finalMessage = isCustomized
        ? (customMessage.trim() || template.message).trim()
        : template.message;

      if (!finalSubject) {
        throw new Error("L'objet de l'email ne peut pas être vide.");
      }

      const processedSubject = replace(finalSubject);
      const processedMessage = replace(finalMessage);

      await sendApplication({
        company: "Direct Apply",
        position: "Direct Apply",
        email: email,
        candidateName: formattedName,
        subject: processedSubject,
        message: processedMessage.replace(/\n/g, "<br>"),
        cv_base64: cvBase64,
        cv_filename: cvFileName || `${formattedName.replace(/\s+/g, "_")}_Resume.pdf`,
        notes: "",
        jobUrl: "",
      });

      const { error } = await supabase.from("applications").insert([
        {
          user_id: user.id,
          company: companyToSave,
          position: "Stage PFE / Emploi",
          email: email,
          status: "success",
        },
      ]);

      if (error) {
        throw error;
      }

      // Automatically sync with Tracker (creates/links company & contact)
      try {
        await syncEmailDispatchToTracker({
          company: companyToSave,
          position: "Stage PFE / Emploi",
          email: email,
          status: "success",
        });
      } catch (syncErr) {
        console.warn("Tracker sync failed:", syncErr);
      }

      toast.success("Draft created in Gmail! Check your Gmail drafts.");
      setEmail("");
      setEmailCheck(validateEmailFormat(""));
      setIsCustomized(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send application.";
      toast.error(message);

      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await supabase.from("applications").insert([
            {
              user_id: authData.user.id,
              company: "Direct Apply",
              position: "Direct Apply",
              email: email,
              status: "failed",
            },
          ]);
        }
      } catch (dbErr) {
        console.error("Unable to record failed application in Supabase", dbErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const emailToneClass = emailCheck.valid
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : emailCheck.code === "empty"
      ? "border-gray-200 bg-white text-gray-500"
      : emailCheck.code === "risky_fallback"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-[960px] space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Manual Apply (Draft)
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Create a pre-saved template as a draft directly in your Gmail with CV attached.
          </p>
        </div>

        {/* Resume Attachment Banner */}
        <CvUploadCard variant="banner" />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Draft Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#fff3ef] text-[#ff5722]">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Create Gmail Draft</h2>
                <p className="text-xs text-gray-500">Generate a reviewable draft in Gmail with CV</p>
              </div>
            </div>

            <div className="flex-1 space-y-5">
              <div className="space-y-2">
                <label className="editorial-label">Recruiter Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--editorial-text-faint)]" />
                  <input
                    className="editorial-input !pl-11"
                    onChange={(event) => {
                      const nextEmail = event.target.value;
                      setEmail(nextEmail);
                      setEmailCheck(validateEmailFormat(nextEmail));
                      if (nextEmail.includes("@") && nextEmail.includes(".")) {
                        void checkDuplicates(nextEmail);
                      } else {
                        setDuplicateMatch(null);
                      }
                    }}
                    onBlur={() => {
                      void runEmailPreflight();
                      void checkDuplicates(email);
                    }}
                    placeholder="talent@company.com"
                    type="email"
                    value={email}
                  />
                </div>
                <div
                  className={cn(
                    "flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-[13px] transition-colors",
                    emailToneClass,
                  )}
                >
                  <div className="flex items-center gap-2">
                    {emailCheck.valid ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : emailCheck.code === "risky_fallback" ? (
                      <TriangleAlert className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span className="font-medium">{emailCheck.message}</span>
                  </div>
                </div>

                {/* Détecteur de doublons */}
                {duplicateMatch && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/95 p-3 text-xs text-amber-900 animate-in fade-in duration-200 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-amber-950">
                            Candidature déjà existante pour ce destinataire !
                          </p>
                          <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                            Il y a {duplicateMatch.daysAgo}j
                          </span>
                        </div>
                        <p className="mt-1 text-amber-800 leading-relaxed">
                          Postulé le <strong>{duplicateMatch.date}</strong> chez{" "}
                          <strong>{duplicateMatch.company}</strong> ({duplicateMatch.position}) · Statut :{" "}
                          <span className="font-medium underline">{duplicateMatch.status}</span>.
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <Link
                            href="/tracker/follow-ups"
                            className="inline-flex items-center gap-1 font-semibold text-amber-950 hover:text-black underline text-[11px]"
                          >
                            Voir dans les relances &rarr;
                          </Link>
                          <span className="text-amber-400">·</span>
                          <button
                            type="button"
                            onClick={() => setDuplicateMatch(null)}
                            className="text-[11px] text-amber-700 hover:text-amber-900 underline cursor-pointer"
                          >
                            Ignorer l&apos;alerte
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 relative">
                <label className="editorial-label">Select Template</label>
                <button
                  className="editorial-input flex w-full items-center justify-between text-left transition-shadow"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  type="button"
                >
                  <span className="truncate">
                    {templates.find((t) => t.id === selectedTemplateId)?.name || "Select Template"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--editorial-text-faint)]" />
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-xl border border-[var(--editorial-border)] bg-white p-1.5 shadow-[0_12px_24px_rgba(16,24,40,0.08)]">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          className={cn(
                            "flex w-full items-center rounded-[8px] px-3 py-2.5 text-[13.5px] font-medium transition-colors text-left",
                            template.id === selectedTemplateId
                              ? "bg-[var(--editorial-primary-soft)] text-[var(--editorial-primary)]"
                              : "text-[var(--editorial-text)] hover:bg-[var(--editorial-background-soft)]"
                          )}
                          onClick={() => handleSelectTemplate(template.id)}
                          type="button"
                        >
                          <span className="truncate">{template.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Option to customize subject & message in a centered modal */}
              <div className="pt-0.5">
                {!isCustomized ? (
                  <button
                    type="button"
                    onClick={handleOpenCustomModal}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#ff5722] transition group cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-gray-400 group-hover:text-[#ff5722] transition-colors" />
                    <span className="underline-offset-2 hover:underline">
                      Personnaliser l&apos;objet et le message pour ce poste
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/70 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5722] text-white text-[11px] font-bold">
                        ✓
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          Email personnalisé pour ce poste
                        </p>
                        <p className="text-[11px] text-gray-500 truncate max-w-[240px]">
                          Objet : {customSubject}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={handleOpenCustomModal}
                        className="font-medium text-[#ff5722] hover:text-[#e64a19] transition cursor-pointer"
                      >
                        Modifier
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={handleCancelCustomization}
                        className="text-gray-500 hover:text-gray-800 transition cursor-pointer"
                        title="Annuler la personnalisation et réactiver le modèle par défaut"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 space-y-2.5">
              <button
                className="editorial-button-primary h-12 w-full text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                disabled={sendDisabled}
                onClick={handleSend}
                type="button"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {n8nBlocked ? "n8n Blocked" : "Create Draft in Gmail"}
              </button>

              <button
                type="button"
                onClick={handleOpenGmailWeb}
                disabled={!email || !emailCheck.valid}
                className="editorial-button-secondary h-10 w-full text-xs font-semibold flex items-center justify-center gap-2 text-gray-700 hover:text-gray-950 border-gray-200 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                title="Ouvrir directement un nouvel onglet Gmail avec le destinataire, l'objet et le message pré-remplis (fonctionne directement sans serveur n8n)"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#ea4335]" />
                <span>Ouvrir dans Gmail Web (Fallback 1-Clic)</span>
              </button>
            </div>
          </div>

          {/* AI Analysis Card (Coming Soon) */}
          <div className="editorial-card relative flex flex-col overflow-hidden p-6 shadow-sm border-dashed">
            <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px]" />
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full border border-[var(--editorial-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--editorial-text)] shadow-sm">
                <BrainCircuit className="h-4 w-4 text-[var(--editorial-primary)]" />
                Coming Soon
              </div>
            </div>

            <div className="mb-6 flex items-center gap-3 opacity-60">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f0ff] text-[#7f5af0]">
                <WandSparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--editorial-text)]">AI Job Analysis</h2>
                <p className="text-sm text-[var(--editorial-text-faint)]">Custom cover letters per job</p>
              </div>
            </div>

            <div className="flex-1 space-y-5 opacity-60">
              <div className="space-y-2">
                <label className="editorial-label">Job Offer Description</label>
                <textarea
                  className="editorial-textarea min-h-[160px] resize-none"
                  disabled
                  placeholder="Paste the job requirements here... AI will analyze the requirements and align your profile to create a custom cover letter."
                />
              </div>
            </div>

            <button
              className="editorial-button-secondary mt-8 h-12 w-full text-sm opacity-60"
              disabled
              type="button"
            >
              <BrainCircuit className="h-4 w-4" />
              Analyze with AI
            </button>
          </div>

        </div>
      </div>

      {/* Modal in the middle of the screen for customizing email */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/60">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff3ef] text-[#ff5722]">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Personnaliser l&apos;email pour ce poste
                  </h3>
                  <p className="text-xs text-gray-500">
                    Modifie l&apos;objet et le corps sans altérer votre modèle enregistré
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="rounded-lg bg-orange-50/70 border border-orange-100 p-3 text-xs text-orange-950 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-[#ff5722] shrink-0 mt-0.5" />
                <span>
                  Cet ajustement est appliqué uniquement à cette candidature directe. Votre modèle d&apos;origine reste intact.
                </span>
              </div>

              {/* Objet / Subject */}
              <div className="space-y-1.5">
                <label className="editorial-label flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  <span>Objet de l&apos;email *</span>
                </label>
                <input
                  type="text"
                  className="editorial-input w-full bg-white text-sm"
                  value={tempSubject}
                  onChange={(e) => setTempSubject(e.target.value)}
                  placeholder="Ex : Candidature Stage PFE / Data Science..."
                  required
                />
              </div>

              {/* Message / Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="editorial-label text-xs text-gray-700 font-medium">
                    Corps de l&apos;email / Message *
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Variables : [Company], [Position], [MyName]
                  </span>
                </div>
                <textarea
                  className="editorial-textarea min-h-[220px] w-full bg-white text-xs font-mono leading-relaxed p-3"
                  value={tempMessage}
                  onChange={(e) => setTempMessage(e.target.value)}
                  placeholder="Tapez ou adaptez le message pour cette entreprise..."
                  required
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/80">
              <button
                type="button"
                onClick={handleResetInModal}
                className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition font-medium cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Réinitialiser au modèle</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition shadow-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomization}
                  className="rounded-lg bg-[#ff5722] px-4 py-2 text-xs font-medium text-white hover:bg-[#e64a19] transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Valider la personnalisation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
