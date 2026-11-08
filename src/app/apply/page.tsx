"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Loader2,
  Mail,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import {
  getIntegrationStatus,
  sendApplication,
  sendDirectApplication,
  validateEmailBeforeSend,
  type EmailPreflightResult,
  type IntegrationStatusResponse,
} from "@/lib/api";
import { validateEmailFormat } from "@/lib/email";
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_LIBRARY_EVENT,
  getStoredTemplates,
} from "@/lib/templates";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_CV_EVENT,
  readActiveCvId,
  readCandidateName,
  readStoredCv,
  readStoredCvLibrary,
  writeActiveCvId,
  type CvProfile,
} from "@/lib/workspace";
import { generateCoverLetterPdf } from "@/lib/coverLetterPdf";
import {
  getWithdrawnEmails,
  inferCompanyFromEmail,
  syncEmailDispatchToTracker,
} from "@/lib/tracker/syncService";
import PreflightCheckModal from "@/components/PreflightCheckModal";

interface DuplicateInfo {
  company: string;
  position: string;
  date: string;
  daysAgo: number;
  status: string;
}

interface LogEntry {
  timestamp: string;
  type: "info" | "success" | "error";
  message: string;
}

interface LastSendResult {
  success: boolean;
  time: string;
  email: string;
  company: string;
  channel: "direct" | "draft";
  attachments: string[];
}

export default function ApplyPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailCheck, setEmailCheck] = useState<EmailPreflightResult>(() =>
    validateEmailFormat("")
  );
  const [emailChecking, setEmailChecking] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateInfo | null>(null);
  const [, setCheckingDuplicate] = useState(false);

  // Dual Dispatch Channel: "direct" (SMTP Inbox) or "draft" (n8n Gmail Draft)
  const [dispatchChannel, setDispatchChannel] = useState<"direct" | "draft">("direct");

  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [integrationStatus, setIntegrationStatus] =
    useState<IntegrationStatusResponse | null>(null);
  const [isPreflightModalOpen, setIsPreflightModalOpen] = useState(false);

  const [templates, setTemplates] = useState(getStoredTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("pfe_dev_fr");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Customization modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isCustomized, setIsCustomized] = useState(false);
  const [tempSubject, setTempSubject] = useState("");
  const [tempMessage, setTempMessage] = useState("");

  // CV & Cover Letter
  const [cvLibrary, setCvLibrary] = useState<CvProfile[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [includeCoverLetter, setIncludeCoverLetter] = useState(false);

  // Live execution logs & preview state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rightTab, setRightTab] = useState<"preview" | "logs">("preview");
  const [lastResult, setLastResult] = useState<LastSendResult | null>(null);

  const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
    const timestamp = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [...prev, { timestamp, type, message }]);
  };

  useEffect(() => {
    const syncCv = () => {
      const lib = readStoredCvLibrary();
      setCvLibrary(lib);
      const active = readActiveCvId();
      setSelectedCvId(active || (lib.length > 0 ? lib[0].id : null));
    };
    syncCv();
    window.addEventListener(WORKSPACE_CV_EVENT, syncCv);
    window.addEventListener("storage", syncCv);
    return () => {
      window.removeEventListener(WORKSPACE_CV_EVENT, syncCv);
      window.removeEventListener("storage", syncCv);
    };
  }, []);

  useEffect(() => {
    const syncInitialState = () => {
      const nextTemplates = getStoredTemplates();
      setTemplates(nextTemplates);
      const initialTpl =
        nextTemplates.find((t) => t.id === "pfe_dev_fr") ??
        nextTemplates[0] ??
        DEFAULT_TEMPLATES[0];
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
          nextTemplates.find((item) => item.id === "pfe_dev_fr") ??
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

  const isDataTrack = selectedTemplateId?.includes("data");
  const isEnglishLang = selectedTemplateId?.includes("_en");

  const handleSelectTrack = (track: "dev" | "data") => {
    const nextId = track === "dev"
      ? (isEnglishLang ? "pfe_dev_en" : "pfe_dev_fr")
      : (isEnglishLang ? "pfe_data_ai_en" : "pfe_data_ai_fr");
    handleSelectTemplate(nextId);
  };

  const handleSelectLang = (lang: "fr" | "en") => {
    const nextId = lang === "fr"
      ? (isDataTrack ? "pfe_data_ai_fr" : "pfe_dev_fr")
      : (isDataTrack ? "pfe_data_ai_en" : "pfe_dev_en");
    handleSelectTemplate(nextId);
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
        toast.error("Impossible de charger l'état des connexions.");
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

  const smtpBlocked =
    integrationStatus?.smtp?.configured === false ||
    integrationStatus?.smtp?.healthy === false;
  const smtpHealthy = integrationStatus?.smtp?.healthy === true;

  const checkDuplicates = async (emailVal: string) => {
    const cleanEmail = emailVal.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setDuplicateMatch(null);
      return;
    }

    setCheckingDuplicate(true);
    try {
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
          company: match.company || "Entreprise",
          position: match.position || "Stage / Emploi",
          date: createdDate.toLocaleDateString("fr-FR"),
          daysAgo,
          status: match.status || "envoyé",
        });
        return;
      }

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
        const compName = (match.company as any)?.name || "Entreprise";
        setDuplicateMatch({
          company: compName,
          position: match.position || "Stage / Emploi",
          date: createdDate.toLocaleDateString("fr-FR"),
          daysAgo,
          status: match.status || "envoyé",
        });
        return;
      }

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
        message: "Cet email est retiré dans votre historique (bloqué pour éviter un bounce).",
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
        message: "Impossible de valider le domaine de l'email.",
      };
      setEmailCheck(fallbackResult);
      return fallbackResult;
    } finally {
      setEmailChecking(false);
    }
  };

  const handleTestConnections = async () => {
    setIntegrationLoading(true);
    try {
      const res = await getIntegrationStatus();
      setIntegrationStatus(res);
      setIsPreflightModalOpen(true);
      const smtpOk = res.smtp?.healthy === true;
      const n8nOk = res.n8n?.healthy === true;

      if (smtpOk && n8nOk) {
        toast.success("Tout est connecté ! Gmail SMTP & n8n sont 100% opérationnels.");
      } else if (smtpOk) {
        toast.success("Canal Envoi Direct connecté avec succès !");
      } else if (n8nOk) {
        toast.info("Canal Brouillons Gmail opérationnel.");
      } else {
        toast.warning("Certaines connexions nécessitent votre attention.");
      }
    } catch {
      toast.error("Impossible de vérifier l'état des connexions.");
    } finally {
      setIntegrationLoading(false);
    }
  };

  // Live Interpolation Calculations for Real-Time Preview
  const inferredCompany = useMemo(() => inferCompanyFromEmail(email), [email]);
  const companyDisplayName = inferredCompany?.name || "votre entreprise";
  const candidateName = readCandidateName() || "Said Nichan";

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];
  }, [templates, selectedTemplateId]);

  const rawSubject = isCustomized ? (customSubject.trim() || activeTemplate.subject) : activeTemplate.subject;
  const rawMessage = isCustomized ? (customMessage.trim() || activeTemplate.message) : activeTemplate.message;

  const replaceTags = (text: string) => {
    return text
      .replace(/in the \[Position\] role/gi, "in the open position")
      .replace(/\[Position\] role/gi, "open position")
      .replace(/\[Position\]/g, "open position")
      .replace(/\{position\}/gi, "open position")
      .replace(/\[Company\]/g, companyDisplayName)
      .replace(/\{company\}/gi, companyDisplayName)
      .replace(/\[MyName\]/g, candidateName)
      .replace(/\{name\}/gi, candidateName)
      .replace(/\[HR Name\]/g, "Hiring Manager");
  };

  const liveSubject = useMemo(() => replaceTags(rawSubject), [rawSubject, companyDisplayName, candidateName]);
  const liveMessage = useMemo(() => replaceTags(rawMessage), [rawMessage, companyDisplayName, candidateName]);

  const matchedCv = useMemo(() => {
    if (selectedCvId) {
      return cvLibrary.find((c) => c.id === selectedCvId);
    }
    return cvLibrary[0] || null;
  }, [selectedCvId, cvLibrary]);

  const cvFileName = matchedCv?.fileName || readStoredCv().fileName || `${candidateName.replace(/\s+/g, "_")}_Resume.pdf`;

  const handleOpenGmailWeb = async () => {
    if (!email || !emailCheck.valid) {
      toast.error("Veuillez saisir une adresse email valide.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const companyToSave = inferredCompany?.name || null;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}&su=${encodeURIComponent(liveSubject)}&body=${encodeURIComponent(liveMessage)}`;

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

  const handleSend = async () => {
    setLoading(true);
    setRightTab("logs");
    setLogs([]);
    setLastResult(null);

    addLog(`Démarrage du processus d'envoi (${dispatchChannel === "direct" ? "Envoi Direct SMTP" : "Brouillon Gmail"})...`, "info");

    try {
      if (integrationLoading) {
        throw new Error("Vérification des connexions en cours. Réessayez dans un instant.");
      }

      addLog(`Validation du destinataire : ${email}...`, "info");
      const emailResult = await runEmailPreflight();
      if (!emailResult.valid) {
        throw new Error(emailResult.message);
      }
      addLog("Vérification syntaxique et domaine MX réussie ✓", "success");

      if (dispatchChannel === "draft" && n8nBlocked) {
        setIsPreflightModalOpen(true);
        throw new Error("Le service de brouillons est temporairement indisponible.");
      }

      if (dispatchChannel === "direct" && smtpBlocked) {
        setIsPreflightModalOpen(true);
        throw new Error(
          "Votre compte email n'est pas encore connecté. Cliquez sur 'Tester la connexion' pour configurer vos accès."
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Vous devez être connecté pour envoyer une candidature.");
      }

      // CV Attachment
      const finalCvBase64 = matchedCv?.base64 || readStoredCv().base64;
      const finalCvFileName = cvFileName;

      if (!finalCvBase64) {
        throw new Error("Aucun CV n'est disponible. Veuillez téléverser un CV dans la Bibliothèque CVs.");
      }
      addLog(`CV joint sélectionné : ${finalCvFileName}`, "info");

      // Optional Cover Letter
      let finalCoverLetterBase64: string | undefined = undefined;
      let finalCoverLetterFileName: string | undefined = undefined;

      if (includeCoverLetter) {
        addLog(`Génération de la lettre de motivation PDF pour ${companyDisplayName}...`, "info");
        try {
          const letterPdf = generateCoverLetterPdf({
            company: companyDisplayName,
            position: "Stage PFE / Emploi",
            contactName: "Hiring Manager",
            body: liveMessage,
            subject: liveSubject,
          });
          finalCoverLetterBase64 = letterPdf.getBase64();
          finalCoverLetterFileName = letterPdf.fileName;
          addLog(`Lettre de motivation générée : ${finalCoverLetterFileName} ✓`, "success");
        } catch (err) {
          console.warn("Cover letter generation warning:", err);
          addLog("Avertissement : la lettre de motivation n'a pas pu être convertie en PDF.", "error");
        }
      }

      const companyToSave = inferredCompany?.name || null;

      if (dispatchChannel === "direct") {
        addLog("Connexion sécurisée au serveur Gmail SMTP...", "info");
        await sendDirectApplication({
          company: companyDisplayName,
          position: "Stage PFE / Emploi",
          email: email,
          candidateName: candidateName,
          subject: liveSubject,
          message: liveMessage,
          cv_base64: finalCvBase64,
          cv_filename: finalCvFileName,
          cv_data: finalCvBase64,
          cv_name: finalCvFileName,
          cover_letter_base64: finalCoverLetterBase64,
          cover_letter_filename: finalCoverLetterFileName,
          notes: "",
          jobUrl: "",
        });
        addLog("Candidature délivrée avec succès dans la boîte principale du recruteur !", "success");
      } else {
        addLog("Transmission des pièces jointes au service de brouillons Gmail...", "info");
        await sendApplication({
          company: companyDisplayName,
          position: "Stage PFE / Emploi",
          email: email,
          candidateName: candidateName,
          subject: liveSubject,
          message: liveMessage.replace(/\n/g, "<br>"),
          cv_base64: finalCvBase64,
          cv_filename: finalCvFileName,
          cv_data: finalCvBase64,
          cv_name: finalCvFileName,
          cover_letter_base64: finalCoverLetterBase64,
          cover_letter_filename: finalCoverLetterFileName,
          notes: "",
          jobUrl: "",
        });
        addLog("Brouillon créé avec succès dans votre boîte Gmail !", "success");
      }

      // Record in Supabase
      const { error: dbError } = await supabase.from("applications").insert([
        {
          user_id: user.id,
          company: companyToSave,
          position: "Stage PFE / Emploi",
          email: email,
          status: "success",
        },
      ]);
      if (dbError) throw dbError;

      // Sync to Tracker
      addLog("Synchronisation avec le Suivi des Candidatures (Tracker)...", "info");
      try {
        await syncEmailDispatchToTracker({
          company: companyToSave,
          position: "Stage PFE / Emploi",
          email: email,
          status: "success",
        });
        addLog("Candidature synchronisée dans le Suivi ✓", "success");
      } catch (syncErr) {
        console.warn("Tracker sync failed:", syncErr);
      }

      const attachmentsList = [
        finalCvFileName,
        ...(finalCoverLetterFileName ? [finalCoverLetterFileName] : []),
      ];

      setLastResult({
        success: true,
        time: new Date().toLocaleTimeString("fr-FR"),
        email: email,
        company: companyDisplayName,
        channel: dispatchChannel,
        attachments: attachmentsList,
      });

      if (dispatchChannel === "direct") {
        toast.success("Candidature envoyée directement avec succès !");
      } else {
        toast.success("Brouillon créé dans Gmail ! Consultez vos brouillons.");
      }

      setEmail("");
      setEmailCheck(validateEmailFormat(""));
      setIsCustomized(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'envoyer la candidature.";
      addLog(`Échec : ${message}`, "error");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const sendDisabled =
    loading ||
    integrationLoading ||
    emailChecking ||
    !email ||
    !emailCheck.valid;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3.5 flex flex-col justify-start">
      {/* Sleek Compact Header Line */}
      <div className="flex items-center justify-between gap-3 pb-2 mb-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
            1-à-1
          </span>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-950 truncate">
            Candidature Spontanée
          </h1>
          <span className="text-gray-300 hidden md:inline">·</span>
          <p className="text-xs text-gray-500 hidden md:inline truncate">
            Email personnalisé avec CV et lettre
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTestConnections}
            disabled={integrationLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className={cn("h-3.5 w-3.5", smtpHealthy ? "text-emerald-600" : "text-blue-600")} />
            <span>Tester connexion</span>
            {smtpHealthy && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <Link
            href="/cv-library"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium shadow-2xs transition"
          >
            <FileText className="h-3.5 w-3.5 text-gray-400" />
            <span>CVs ({cvLibrary.length})</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Form (7 cols) + Dual-Tab Pane (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        
        {/* LEFT COLUMN: THE COMPACT FORM */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
          
          {/* 1. Canal d'envoi (Segmented Control) */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100/80 p-1 shrink-0">
            <button
              type="button"
              onClick={() => setDispatchChannel("direct")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer",
                dispatchChannel === "direct"
                  ? "bg-white text-blue-700 shadow-2xs border border-blue-200 font-bold"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Send className="h-3.5 w-3.5 text-blue-600" />
              <span>⚡ Envoi Direct (Inbox)</span>
            </button>

            <button
              type="button"
              onClick={() => setDispatchChannel("draft")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer",
                dispatchChannel === "draft"
                  ? "bg-white text-[#ff5722] shadow-2xs border border-orange-200 font-bold"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <FileText className="h-3.5 w-3.5 text-[#ff5722]" />
              <span>📝 Brouillon Gmail (Relire)</span>
            </button>
          </div>

          {/* 2. Destinataire (Recruiter Email) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">
                Email du recruteur <span className="text-red-500">*</span>
              </label>
              {inferredCompany && inferredCompany.name && (
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.2 rounded-full">
                  🏢 {inferredCompany.name}
                </span>
              )}
            </div>

            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                className={cn(
                  "w-full rounded-xl border bg-gray-50/50 h-9 pl-9 pr-9 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none transition",
                  emailCheck.valid
                    ? "border-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    : email && emailCheck.code !== "empty"
                      ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      : "border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                )}
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
                placeholder="ex: recrutement@airbus.com ou talent@startup.fr"
                type="email"
                value={email}
              />
              {email && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {emailChecking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                  ) : emailCheck.valid ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                </div>
              )}
            </div>

            {/* Validation warning if invalid */}
            {email && !emailCheck.valid && (
              <p className="text-[11px] text-red-600 flex items-center gap-1 mt-0.5">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{emailCheck.message}</span>
              </p>
            )}

            {/* Duplicate Match Warning */}
            {duplicateMatch && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-2 text-xs text-amber-900 animate-in fade-in duration-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-amber-950 text-[11px]">
                        Déjà postulé chez {duplicateMatch.company} ({duplicateMatch.position})
                      </p>
                      <span className="rounded bg-amber-200 px-1 py-0.2 text-[9px] font-bold text-amber-900">
                        {duplicateMatch.daysAgo}j
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Link
                        href="/tracker/follow-ups"
                        className="font-semibold text-amber-950 hover:underline text-[10.5px]"
                      >
                        Voir dans les relances &rarr;
                      </Link>
                      <span className="text-amber-400">·</span>
                      <button
                        type="button"
                        onClick={() => setDuplicateMatch(null)}
                        className="text-[10.5px] text-amber-700 hover:text-amber-950 underline cursor-pointer"
                      >
                        Ignorer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Modèle de candidature & Personnalisation */}
          <div className="space-y-1 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">
                Modèle de candidature
              </label>
              <div className="flex items-center gap-1.5">
                {/* Track pills */}
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectTrack("dev")}
                    className={cn(
                      "rounded-md px-2 py-0.2 text-[10.5px] font-medium transition cursor-pointer",
                      !isDataTrack
                        ? "bg-white text-blue-700 shadow-2xs font-bold"
                        : "text-gray-500 hover:text-gray-800"
                    )}
                  >
                    💻 Dév
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTrack("data")}
                    className={cn(
                      "rounded-md px-2 py-0.2 text-[10.5px] font-medium transition cursor-pointer",
                      isDataTrack
                        ? "bg-white text-emerald-700 shadow-2xs font-bold"
                        : "text-gray-500 hover:text-gray-800"
                    )}
                  >
                    🤖 Data
                  </button>
                </div>

                {/* Language pills */}
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectLang("fr")}
                    className={cn(
                      "rounded-md px-1.5 py-0.2 text-[10px] font-bold transition cursor-pointer",
                      !isEnglishLang
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-gray-500 hover:text-gray-800"
                    )}
                  >
                    FR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectLang("en")}
                    className={cn(
                      "rounded-md px-1.5 py-0.2 text-[10px] font-bold transition cursor-pointer",
                      isEnglishLang
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-gray-500 hover:text-gray-800"
                    )}
                  >
                    EN
                  </button>
                </div>
              </div>
            </div>

            {/* Template selector button */}
            <button
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white px-3 h-9 text-left text-xs text-gray-800 flex items-center justify-between transition shadow-2xs cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              type="button"
            >
              <span className="truncate font-medium">{activeTemplate.name}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl max-h-56 overflow-y-auto">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={cn(
                        "w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition flex items-center justify-between",
                        tpl.id === selectedTemplateId
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-xs">{tpl.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{tpl.subject}</p>
                      </div>
                      {tpl.id === selectedTemplateId && (
                        <span className="text-blue-600 font-bold ml-2">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Customization Link */}
            <div className="pt-0.5">
              {!isCustomized ? (
                <button
                  type="button"
                  onClick={handleOpenCustomModal}
                  className="inline-flex items-center gap-1 text-[11.5px] text-gray-500 hover:text-blue-600 transition cursor-pointer"
                >
                  <Edit3 className="h-3 w-3 text-gray-400" />
                  <span className="hover:underline">Personnaliser le contenu pour ce poste</span>
                </button>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/80 px-2.5 py-1 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#ff5722] text-white text-[9px] font-bold">
                      ✓
                    </span>
                    <span className="font-semibold text-orange-950 truncate text-[11px]">Email sur-mesure</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[11px]">
                    <button
                      type="button"
                      onClick={handleOpenCustomModal}
                      className="font-medium text-[#ff5722] hover:underline cursor-pointer"
                    >
                      Modifier
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      type="button"
                      onClick={handleCancelCustomization}
                      className="text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Pièces jointes (CV & Lettre) */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-700 font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                CV joint :
              </span>
              <select
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 max-w-[240px] truncate"
                value={selectedCvId || ""}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedCvId(newId);
                  writeActiveCvId(newId);
                  const chosen = cvLibrary.find((c) => c.id === newId);
                  if (chosen) toast.info(`CV sélectionné : ${chosen.label}`);
                }}
              >
                {cvLibrary.length === 0 ? (
                  <option value="">Aucun CV importé</option>
                ) : (
                  cvLibrary.map((c) => (
                    <option key={c.id} value={c.id}>
                      📄 {c.label} ({c.fileName})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-gray-200/50">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 font-medium">
                <input
                  type="checkbox"
                  checked={includeCoverLetter}
                  onChange={(e) => {
                    setIncludeCoverLetter(e.target.checked);
                    if (e.target.checked) {
                      toast.info("Lettre de motivation générée automatiquement en PDF !");
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Joindre Lettre de Motivation (PDF)</span>
              </label>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                Auto
              </span>
            </div>
          </div>

          {/* 5. Bouton d'action principal + Fallback 1-clic */}
          <div className="pt-1 space-y-1.5">
            <button
              type="button"
              onClick={handleSend}
              disabled={sendDisabled}
              className={cn(
                "w-full h-10 sm:h-11 text-xs sm:text-sm font-bold rounded-xl text-white transition shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none",
                dispatchChannel === "direct"
                  ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                  : "bg-[#ff5722] hover:bg-[#e64a19] active:bg-[#d84315]"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {dispatchChannel === "direct"
                      ? "Envoi en cours via Gmail SMTP..."
                      : "Création du brouillon en cours..."}
                  </span>
                </>
              ) : (
                <>
                  {dispatchChannel === "direct" ? (
                    <Send className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span>
                    {dispatchChannel === "direct"
                      ? "Envoyer la candidature (Envoi Direct)"
                      : "Créer le brouillon dans Gmail"}
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleOpenGmailWeb}
                disabled={!email || !emailCheck.valid}
                className="text-[11px] text-gray-400 hover:text-gray-700 transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Alternative : ouvrir directement dans Gmail Web</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DUAL-TAB PANE (Live Preview / Dispatch Logs) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs flex flex-col justify-start">
          
          {/* Tab Bar */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/70 p-1.5 shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRightTab("preview")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
                  rightTab === "preview"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                <Eye className="h-3.5 w-3.5 text-blue-600" />
                <span>Aperçu en Direct</span>
              </button>

              <button
                type="button"
                onClick={() => setRightTab("logs")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
                  rightTab === "logs"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                <Terminal className="h-3.5 w-3.5 text-purple-600" />
                <span>Journal d&apos;Envoi</span>
                {logs.length > 0 && (
                  <span className="rounded-full bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-700">
                    {logs.length}
                  </span>
                )}
              </button>
            </div>

            <span className="text-[11px] font-medium text-gray-400 pr-2">
              {rightTab === "preview" ? "Temps réel" : "Logs"}
            </span>
          </div>

          {/* Content Area */}
          <div className="p-3.5 flex flex-col overflow-hidden">
            
            {/* TAB 1: LIVE EMAIL PREVIEW */}
            {rightTab === "preview" && (
              <div className="flex flex-col space-y-3">
                {/* Simulated Envelope Header */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-2.5 space-y-1.5 text-xs shrink-0">
                  <div className="flex items-center justify-between text-gray-500 text-[10.5px] border-b border-gray-200/60 pb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-400" />
                      <span className="h-2 w-2 rounded-full bg-yellow-400" />
                      <span className="h-2 w-2 rounded-full bg-green-400" />
                      <span className="font-semibold text-gray-700 ml-1">Boîte de réception simulée</span>
                    </div>
                    <span>SMTP / SSL</span>
                  </div>

                  <div className="space-y-0.5 text-gray-700 text-[11.5px]">
                    <p className="truncate">
                      <strong className="text-gray-900">De :</strong> {candidateName} &lt;vous@gmail.com&gt;
                    </p>
                    <p className="truncate">
                      <strong className="text-gray-900">À :</strong>{" "}
                      <span className={cn(email ? "text-blue-700 font-mono font-medium" : "text-gray-400 italic")}>
                        {email || "recruteur@entreprise.com"}
                      </span>
                    </p>
                    <p className="truncate">
                      <strong className="text-gray-900">Objet :</strong>{" "}
                      <span className="font-semibold text-gray-900">{liveSubject}</span>
                    </p>
                  </div>

                  {/* Attached Files Badges */}
                  <div className="pt-1.5 border-t border-gray-200/60 flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.2 font-mono text-[10.5px] text-blue-800">
                      <FileCheck className="h-3 w-3 text-blue-600" />
                      {cvFileName}
                    </span>
                    {includeCoverLetter && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-1.5 py-0.2 font-mono text-[10.5px] text-purple-800">
                        <FileText className="h-3 w-3 text-purple-600" />
                        Lettre_{companyDisplayName.replace(/\s+/g, "_")}.pdf
                      </span>
                    )}
                  </div>
                </div>

                {/* Email Body Preview */}
                <div className="rounded-xl border border-gray-100 bg-white p-3 overflow-y-auto max-h-[220px] sm:max-h-[260px]">
                  <div className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {liveMessage}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LIVE DISPATCH LOGS */}
            {rightTab === "logs" && (
              <div className="flex flex-col space-y-2.5">
                {/* Success Result Card */}
                {lastResult && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs animate-in fade-in duration-200 space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                          {lastResult.channel === "direct"
                            ? "Candidature Envoyée !"
                            : "Brouillon Créé !"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        {lastResult.time}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-emerald-800 text-[11px]">
                      <p className="truncate">
                        <strong>Destinataire :</strong> {lastResult.email} ({lastResult.company})
                      </p>
                      <p className="truncate">
                        <strong>Pièces :</strong> {lastResult.attachments.join(", ")}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-emerald-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-medium">
                        Tracker : <strong>Synchronisé ✓</strong>
                      </span>
                      <a
                        href={
                          lastResult.channel === "direct"
                            ? "https://mail.google.com/mail/u/0/#sent"
                            : "https://mail.google.com/mail/u/0/#drafts"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-emerald-900 hover:underline"
                      >
                        <span>Voir dans Gmail</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Logs Feed Container */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 overflow-y-auto max-h-[280px] space-y-1.5 font-mono text-[11px]">
                  {logs.length === 0 ? (
                    <div className="py-6 flex flex-col items-center justify-center text-center text-gray-400 space-y-1.5">
                      <Clock className="h-6 w-6 text-gray-300 stroke-1" />
                      <p className="text-xs font-sans text-gray-500 font-medium">
                        En attente d&apos;envoi
                      </p>
                      <p className="text-[10.5px] font-sans text-gray-400 max-w-xs">
                        Les étapes d&apos;envoi détaillées (validation DNS, pièces jointes, SMTP) s&apos;afficheront ici lors du clic sur Envoyer.
                      </p>
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-start gap-1.5 p-1.5 rounded leading-relaxed animate-in fade-in duration-150",
                          log.type === "success"
                            ? "bg-emerald-50/90 text-emerald-900 border border-emerald-200"
                            : log.type === "error"
                              ? "bg-red-50 text-red-900 border border-red-200"
                              : "bg-white text-gray-800 border border-gray-100"
                        )}
                      >
                        <span className="text-[9.5px] text-gray-400 shrink-0 mt-0.5">
                          {log.timestamp}
                        </span>
                        <span className="shrink-0 mt-0.5">
                          {log.type === "success" ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          ) : log.type === "error" ? (
                            <AlertCircle className="h-3 w-3 text-red-600" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                          )}
                        </span>
                        <span className="flex-1 break-words">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for email customization */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/60">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#ff5722]">
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

              {/* Objet */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-700 font-medium block">
                  Objet de l&apos;email *
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500"
                  value={tempSubject}
                  onChange={(e) => setTempSubject(e.target.value)}
                  placeholder="Ex : Candidature Stage PFE / Data Science..."
                  required
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-700 font-medium">
                    Corps de l&apos;email / Message *
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Variables : [Company], [Position], [MyName]
                  </span>
                </div>
                <textarea
                  className="min-h-[220px] w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-mono leading-relaxed outline-none focus:border-blue-500"
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
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomization}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Valider la personnalisation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-flight Diagnostic Modal */}
      <PreflightCheckModal
        isOpen={isPreflightModalOpen}
        onClose={() => setIsPreflightModalOpen(false)}
        initialStatus={integrationStatus}
        onStatusUpdated={(s) => setIntegrationStatus(s)}
      />
    </div>
  );
}
