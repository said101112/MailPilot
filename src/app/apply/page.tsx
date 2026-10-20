"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Edit3,
  FileText,
  Loader2,
  Mail,
  RotateCcw,
  Send,
  Sparkles,
  TriangleAlert,
  WandSparkles,
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
} from "@/lib/tracker/syncService";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { readStoredCv } from "@/lib/workspace";
import CvUploadCard from "@/components/CvUploadCard";

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
  const [customSubject, setCustomSubject] = useState(DEFAULT_TEMPLATES[0].subject);
  const [customMessage, setCustomMessage] = useState(DEFAULT_TEMPLATES[0].message);
  const [showMessageEditor, setShowMessageEditor] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const syncInitialState = () => {
      const nextTemplates = getStoredTemplates();
      setTemplates(nextTemplates);
      const initialTpl = nextTemplates[0] ?? DEFAULT_TEMPLATES[0];
      setSelectedTemplateId(initialTpl.id);
      setCustomSubject(initialTpl.subject);
      setCustomMessage(initialTpl.message);
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
    }
  };

  const handleResetTemplate = () => {
    const current = templates.find((t) => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];
    if (current) {
      setCustomSubject(current.subject);
      setCustomMessage(current.message);
      toast.info("Objet et message réinitialisés au modèle d'origine.");
    }
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

  const runEmailPreflight = async (emailValue = email) => {
    const formatResult = validateEmailFormat(emailValue);
    setEmailCheck(formatResult);

    if (!formatResult.valid) {
      return formatResult;
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

      const finalSubject = (customSubject.trim() || template.subject).trim();
      const finalMessage = (customMessage.trim() || template.message).trim();

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
                    }}
                    onBlur={() => {
                      void runEmailPreflight();
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

              {/* Editable Email Subject */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="editorial-label flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-gray-500" />
                    <span>Objet de l&apos;email *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    className="text-[11px] text-gray-400 hover:text-gray-700 flex items-center gap-1 transition"
                    title="Réinitialiser l'objet et le message au modèle d'origine"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Réinitialiser</span>
                  </button>
                </div>
                <input
                  type="text"
                  className="editorial-input w-full font-medium text-xs text-gray-900"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Ex : Candidature Stage PFE / Data Science..."
                  required
                />
                <p className="text-[10px] text-gray-400">
                  Modifiez librement l&apos;objet avant de créer le brouillon dans Gmail.
                </p>
              </div>

              {/* Editable Message / Cover Letter */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="editorial-label flex items-center gap-1.5">
                    <Edit3 className="h-3.5 w-3.5 text-gray-500" />
                    <span>Corps de l&apos;email / Message</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMessageEditor(!showMessageEditor)}
                    className="text-[11px] font-semibold text-[#ff5722] hover:underline"
                  >
                    {showMessageEditor ? "Masquer le texte" : "Personnaliser le texte"}
                  </button>
                </div>

                {showMessageEditor ? (
                  <textarea
                    className="editorial-textarea min-h-[140px] w-full text-xs font-mono"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Tapez ou modifiez le contenu de votre email ici..."
                  />
                ) : (
                  <div
                    onClick={() => setShowMessageEditor(true)}
                    className="rounded-lg border border-gray-200 bg-gray-50/60 p-2.5 text-xs text-gray-600 line-clamp-3 cursor-pointer hover:bg-gray-100/70 transition"
                    title="Cliquer pour modifier le corps de l'email"
                  >
                    {customMessage || "Aucun message..."}
                  </div>
                )}
              </div>
            </div>

            <button
              className="editorial-button-primary mt-8 h-12 w-full text-sm"
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
    </div>
  );
}
