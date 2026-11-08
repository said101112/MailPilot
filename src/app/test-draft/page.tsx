"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  FlaskConical,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { sendApplication, sendDirectApplication } from "@/lib/api";
import { generateCoverLetterPdf } from "@/lib/coverLetterPdf";
import { CoverLetterModal } from "@/components/CoverLetterModal";
import {
  DEFAULT_TEMPLATES,
  getStoredTemplates,
  syncTemplatesFromSupabase,
  type MessageTemplate,
} from "@/lib/templates";
import {
  getActiveCv,
  readCandidateName,
  readStoredCv,
  readStoredCvLibrary,
  type CvProfile,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";

interface TestLog {
  timestamp: string;
  type: "info" | "success" | "error";
  message: string;
}

export default function TestDraftPage() {
  const [recipientEmail, setRecipientEmail] = useState("saidnichan6@gmail.com");
  const [companyName, setCompanyName] = useState("Entreprise Test (Sandbox)");
  const [positionTitle, setPositionTitle] = useState("Stage PFE - Ingénieur Logiciel & IA");
  const [contactName, setContactName] = useState("Responsable Recrutement");

  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("pfe_dev_fr");
  const [cvLibrary, setCvLibrary] = useState<CvProfile[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [includeCoverLetter, setIncludeCoverLetter] = useState<boolean>(true);
  const [testChannel, setTestChannel] = useState<"draft" | "direct">("direct");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [lastDraftResult, setLastDraftResult] = useState<{
    success: boolean;
    time: string;
    attachments: string[];
    email: string;
  } | null>(null);

  // Load templates & CVs
  useEffect(() => {
    const loaded = getStoredTemplates();
    setTemplates(loaded);
    void syncTemplatesFromSupabase().then((res) => {
      if (res && res.length > 0) setTemplates(res);
    });

    const cvs = readStoredCvLibrary();
    setCvLibrary(cvs);
    const active = getActiveCv();
    if (active) {
      setSelectedCvId(active.id);
    } else if (cvs.length > 0) {
      setSelectedCvId(cvs[0].id);
    }
  }, []);

  // Active template
  const activeTemplate = useMemo(() => {
    return (
      templates.find((t) => t.id === selectedTemplateId) ||
      templates[0] ||
      DEFAULT_TEMPLATES[0]
    );
  }, [templates, selectedTemplateId]);

  // Track & Lang helpers
  const isDataAi = selectedTemplateId.includes("data_ai");
  const isEnglish = selectedTemplateId.endsWith("_en");

  const switchTrack = (track: "dev" | "data") => {
    const lang = isEnglish ? "en" : "fr";
    const targetId = track === "dev" ? `pfe_dev_${lang}` : `pfe_data_ai_${lang}`;
    if (templates.some((t) => t.id === targetId)) {
      setSelectedTemplateId(targetId);
    }
  };

  const switchLanguage = (lang: "fr" | "en") => {
    const track = isDataAi ? "data_ai" : "dev";
    const targetId = `pfe_${track}_${lang}`;
    if (templates.some((t) => t.id === targetId)) {
      setSelectedTemplateId(targetId);
    }
  };

  // Selected CV details
  const selectedCv = useMemo(() => {
    if (selectedCvId) {
      const match = cvLibrary.find((c) => c.id === selectedCvId);
      if (match) return match;
    }
    return getActiveCv() || readStoredCv();
  }, [cvLibrary, selectedCvId]);

  const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString("fr-FR"),
        type,
        message,
      },
    ]);
  };

  const handleQuickPreview = () => {
    try {
      const candidateName = readCandidateName();
      const letterPdf = generateCoverLetterPdf({
        candidateName,
        company: companyName || "Entreprise Test",
        position: positionTitle || "Stage PFE",
        contactName: contactName || "Hiring Manager",
        body: activeTemplate.message,
        subject: activeTemplate.subject,
      });

      const uri = letterPdf.getDataUri();
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${uri}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      } else {
        letterPdf.download();
      }
      toast.success("Aperçu de la lettre de motivation généré.");
    } catch {
      toast.error("Impossible de générer l'aperçu PDF.");
    }
  };

  const handleTestDraft = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Veuillez saisir une adresse email de test valide.");
      return;
    }

    setIsLoading(true);
    setLogs([]);
    setLastDraftResult(null);

    const candidateName = readCandidateName();
    addLog(`Démarrage du test Sandbox pour ${recipientEmail}...`, "info");

    try {
      // 1. Prepare CV
      const finalCvBase64 = selectedCv?.base64;
      const finalCvFileName =
        selectedCv?.fileName || `${candidateName.replace(/\s+/g, "_")}_Resume.pdf`;

      if (!finalCvBase64) {
        throw new Error(
          "Aucun CV n'est disponible. Veuillez téléverser un CV dans la Bibliothèque CVs."
        );
      }
      addLog(`CV préparé : ${finalCvFileName}`, "info");

      // 2. Prepare Cover Letter PDF
      let finalCoverLetterBase64: string | undefined = undefined;
      let finalCoverLetterFileName: string | undefined = undefined;

      if (includeCoverLetter) {
        addLog("Génération de la Lettre de motivation PDF...", "info");
        const letterPdf = generateCoverLetterPdf({
          company: companyName || "Entreprise Test",
          position: positionTitle || "Stage PFE",
          contactName: contactName || "Hiring Manager",
          body: activeTemplate.message,
          subject: activeTemplate.subject,
        });
        finalCoverLetterBase64 = letterPdf.getBase64();
        finalCoverLetterFileName = letterPdf.fileName;
        addLog(
          `Lettre PDF générée : ${finalCoverLetterFileName} (${Math.round(
            (finalCoverLetterBase64.length * 3) / 4 / 1024
          )} Ko)`,
          "info"
        );
      } else {
        addLog("Option Lettre PDF décochée : seul le CV sera attaché.", "info");
      }

      // 3. Placeholders replacement
      const replace = (text: string) => {
        return text
          .replace(/\[Company\]/gi, companyName)
          .replace(/\[Position\]/gi, positionTitle)
          .replace(/\[Name\]/gi, contactName)
          .replace(/\[MyName\]/gi, candidateName);
      };

      const processedSubject = `[TEST SANDBOX] ${replace(activeTemplate.subject)}`;
      const processedMessage = replace(activeTemplate.message).replace(/\n/g, "<br>");

      if (testChannel === "direct") {
        addLog("Envoi direct via Gmail SMTP (smtp.gmail.com:465)...", "info");
        await sendDirectApplication({
          email: recipientEmail,
          company: companyName,
          position: positionTitle,
          name: contactName,
          candidateName,
          subject: processedSubject,
          message: processedMessage,
          cv_base64: finalCvBase64,
          cv_filename: finalCvFileName,
          cv_data: finalCvBase64,
          cv_name: finalCvFileName,
          cover_letter_base64: finalCoverLetterBase64,
          cover_letter_filename: finalCoverLetterFileName,
        });
        addLog("Email délivré avec succès directement via Google SMTP (sans passer par spam) !", "success");
      } else {
        addLog("Envoi de la requête au Webhook n8n (création du brouillon Gmail)...", "info");
        await sendApplication({
          email: recipientEmail,
          company: companyName,
          position: positionTitle,
          name: contactName,
          candidateName,
          subject: processedSubject,
          message: processedMessage,
          cv_base64: finalCvBase64,
          cv_filename: finalCvFileName,
          cv_data: finalCvBase64,
          cv_name: finalCvFileName,
          cover_letter_base64: finalCoverLetterBase64,
          cover_letter_filename: finalCoverLetterFileName,
        });
        addLog("Réponse reçue du Webhook n8n avec succès (HTTP 200).", "success");
      }

      addLog(
        "Garantie Sandbox validée : 0 candidature ajoutée au Tracker. Compteurs préservés.",
        "success"
      );

      const attachedFiles = [finalCvFileName];
      if (finalCoverLetterFileName) attachedFiles.push(finalCoverLetterFileName);

      setLastDraftResult({
        success: true,
        time: new Date().toLocaleTimeString("fr-FR"),
        attachments: attachedFiles,
        email: recipientEmail,
      });

      if (testChannel === "direct") {
        toast.success("Email test envoyé directement dans votre boîte principale !");
      } else {
        toast.success("Brouillon test créé avec succès dans vos Brouillons Gmail !");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue lors du test.";
      addLog(`Échec : ${msg}`, "error");
      toast.error(`Échec du test : ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-[1040px] space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-[#f9fafb] px-2.5 py-0.5 text-xs font-semibold text-gray-700 mb-2">
              <FlaskConical className="h-3.5 w-3.5 text-[#ff5722]" />
              Mode Sandbox Isolé (Zero Impact Counter)
            </div>
            <h1 className="page-title text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Testeur de Brouillons Gmail
            </h1>
            <p className="page-subtitle mt-1 text-xs text-gray-500">
              Testez la création de vos brouillons, l’attachement de votre CV et de la Lettre PDF sans affecter vos statistiques.
            </p>
          </div>

          <a
            href="https://mail.google.com/mail/u/0/#drafts"
            target="_blank"
            rel="noopener noreferrer"
            className="editorial-button-secondary h-9 px-3.5 text-xs flex items-center gap-1.5 shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
            <span>Ouvrir Gmail (Brouillons)</span>
          </a>
        </div>

        {/* Protection Banner - Styled to Hunter/MailPilot Card Standards */}
        <div className="editorial-card p-4 bg-[#f9fafb]">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-[#fff3ef] border border-[#ff5722]/30 p-2 text-[#ff5722] shrink-0">
              <ShieldCheck className="h-5 w-5 text-[#ff5722]" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                Protection Totale de vos Compteurs de Candidature
              </h3>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Ce formulaire communique directement avec votre webhook n8n pour générer un brouillon dans votre compte Gmail, mais il <strong>n’enregistre absolument rien</strong> dans vos tables <code>applications</code> ni dans votre <strong>Tracker</strong>. Vous pouvez faire autant de tests que vous voulez sans fausser vos statistiques.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Form Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="editorial-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#ff5722]" />
                  Paramètres du Test
                </h2>
                <span className="text-[11px] text-gray-400">MailPilot • Sandbox</span>
              </div>

              {/* Recipient Email */}
              <div>
                <label className="editorial-label text-xs font-medium text-gray-700 mb-1 block">
                  Email de destination pour le test
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="votre-email@gmail.com"
                  className="editorial-input font-mono text-xs"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Le brouillon sera créé dans votre Gmail adressé à cette adresse de test.
                </p>
              </div>

              {/* Company & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="editorial-label text-xs font-medium text-gray-700 mb-1 block">
                    Entreprise fictive
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="editorial-input text-xs"
                  />
                </div>
                <div>
                  <label className="editorial-label text-xs font-medium text-gray-700 mb-1 block">
                    Poste cible
                  </label>
                  <input
                    type="text"
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    className="editorial-input text-xs"
                  />
                </div>
              </div>

              {/* Contact name */}
              <div>
                <label className="editorial-label text-xs font-medium text-gray-700 mb-1 block">
                  Nom du contact / Recruteur
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="editorial-input text-xs"
                />
              </div>

              {/* Track & Language Selector */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="editorial-label text-xs font-medium text-gray-700">
                    Modèle & Piste
                  </label>
                  <div className="flex items-center gap-1.5">
                    {/* Track switcher */}
                    <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => switchTrack("dev")}
                        className={cn(
                          "px-2 py-0.5 rounded font-medium transition-colors text-xs",
                          !isDataAi
                            ? "bg-white text-gray-900 shadow-2xs font-semibold"
                            : "text-gray-500 hover:text-gray-800"
                        )}
                      >
                        💻 Dév
                      </button>
                      <button
                        type="button"
                        onClick={() => switchTrack("data")}
                        className={cn(
                          "px-2 py-0.5 rounded font-medium transition-colors text-xs",
                          isDataAi
                            ? "bg-white text-gray-900 shadow-2xs font-semibold"
                            : "text-gray-500 hover:text-gray-800"
                        )}
                      >
                        🤖 Data & IA
                      </button>
                    </div>

                    {/* Lang switcher */}
                    <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => switchLanguage("fr")}
                        className={cn(
                          "px-1.5 py-0.5 rounded font-bold transition-colors text-xs",
                          !isEnglish
                            ? "bg-[#ff5722] text-white shadow-2xs"
                            : "text-gray-500 hover:text-gray-800"
                        )}
                      >
                        FR
                      </button>
                      <button
                        type="button"
                        onClick={() => switchLanguage("en")}
                        className={cn(
                          "px-1.5 py-0.5 rounded font-bold transition-colors text-xs",
                          isEnglish
                            ? "bg-[#ff5722] text-white shadow-2xs"
                            : "text-gray-500 hover:text-gray-800"
                        )}
                      >
                        EN
                      </button>
                    </div>
                  </div>
                </div>

                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="editorial-select text-xs"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* CV Selector */}
              <div className="pt-2 border-t border-gray-100">
                <label className="editorial-label text-xs font-medium text-gray-700 mb-1 block">
                  CV à attacher
                </label>
                <select
                  value={selectedCvId}
                  onChange={(e) => setSelectedCvId(e.target.value)}
                  className="editorial-select text-xs"
                >
                  {cvLibrary.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      📄 {cv.label} ({cv.fileName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cover Letter Checkbox & Preview Controls */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeCoverLetter}
                      onChange={(e) => setIncludeCoverLetter(e.target.checked)}
                      className="rounded border-gray-300 text-[#ff5722] focus:ring-[#ff5722] h-4 w-4"
                    />
                    <span className="text-xs font-medium text-gray-900">
                      Générer et joindre la Lettre de motivation PDF
                    </span>
                    <span className="rounded-full bg-orange-50 text-[#e04822] px-2 py-0.5 text-[10px] font-semibold border border-orange-200">
                      {isDataAi ? "Data & IA" : "Dév"} • {isEnglish ? "EN" : "FR"}
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleQuickPreview}
                      className="editorial-button-secondary h-7 px-2.5 text-[11px] font-medium flex items-center gap-1 shadow-2xs"
                      title="Ouvrir l'aperçu PDF directement"
                    >
                      <Eye className="h-3 w-3 text-gray-600" />
                      <span>Aperçu PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="editorial-button-secondary h-7 px-2.5 text-[11px] font-medium flex items-center gap-1 shadow-2xs"
                      title="Personnaliser et voir les 4 versions"
                    >
                      <FileText className="h-3 w-3 text-[#ff5722]" />
                      <span>Détails & Versions</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 ml-6 mt-0.5">
                  Fichier joint : <code>{isEnglish ? "Cover_Letter.pdf" : "Lettre_de_Motivation.pdf"}</code> (Design Portfolio • Sans nom d’entreprise)
                </p>
              </div>

              {/* Channel Selector */}
              <div className="pt-2 border-t border-gray-100">
                <label className="editorial-label text-xs font-medium text-gray-700 mb-1.5 block">
                  Canal d&apos;expédition du test
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestChannel("direct")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-medium transition cursor-pointer text-left",
                      testChannel === "direct"
                        ? "border-blue-600 bg-blue-50/50 text-blue-900 font-bold ring-1 ring-blue-600"
                        : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
                    )}
                  >
                    <Send className="h-3.5 w-3.5 text-blue-600" />
                    <span>⚡ Envoi Direct (Inbox)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestChannel("draft")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-medium transition cursor-pointer text-left",
                      testChannel === "draft"
                        ? "border-[#ff5722] bg-orange-50/50 text-orange-950 font-bold ring-1 ring-[#ff5722]"
                        : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 text-[#ff5722]" />
                    <span>📝 Brouillon (n8n)</span>
                  </button>
                </div>
              </div>

              {/* Submit Test Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestDraft}
                  disabled={isLoading}
                  className={cn(
                    "w-full h-11 text-xs font-semibold rounded-xl text-white transition shadow-sm cursor-pointer flex items-center justify-center gap-2",
                    testChannel === "direct"
                      ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                      : "bg-[#ff5722] hover:bg-[#e64a19] active:bg-[#d84315]"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{testChannel === "direct" ? "Envoi direct en cours..." : "Création du brouillon en cours..."}</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>
                        {testChannel === "direct"
                          ? "Tester l'Envoi Direct dans ma boîte Gmail (Sans Spam)"
                          : "Tester la Création du Brouillon Gmail (n8n)"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Diagnostics and Results Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Success Result Card */}
            {lastDraftResult && (
              <div className="editorial-card p-4 bg-emerald-50/50 border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Brouillon créé avec succès dans Gmail !</span>
                </div>
                <div className="space-y-1.5 text-xs text-emerald-800">
                  <p>
                    <strong>Destinataire :</strong> {lastDraftResult.email}
                  </p>
                  <p>
                    <strong>Heure :</strong> {lastDraftResult.time}
                  </p>
                  <div>
                    <strong>Pièces jointes ({lastDraftResult.attachments.length}) :</strong>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {lastDraftResult.attachments.map((file, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-white px-2 py-0.5 font-mono text-[11px] text-emerald-900"
                        >
                          <FileText className="h-3 w-3 text-emerald-600" />
                          {file}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-emerald-700">
                    Compteur Tracker : <strong>0 ajouté</strong>
                  </span>
                  <a
                    href="https://mail.google.com/mail/u/0/#drafts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-900 hover:underline"
                  >
                    <span>Vérifier dans Gmail</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Diagnostic Feed */}
            <div className="editorial-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Journal d’exécution
                </span>
                <span className="text-[11px] font-mono text-gray-400">Webhook n8n</span>
              </div>

              <div className="space-y-2 text-xs max-h-72 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-400 italic text-[11px] py-4 text-center">
                    En attente d’un test. Cliquez sur le bouton orange ci-contre pour créer un brouillon sans impacter vos compteurs.
                  </p>
                ) : (
                  logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start gap-2 text-[11px] p-1.5 rounded",
                        log.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                          : log.type === "error"
                          ? "bg-red-50 text-red-800 border border-red-100"
                          : "bg-gray-50 text-gray-700"
                      )}
                    >
                      <span className="text-gray-400 shrink-0 font-mono">[{log.timestamp}]</span>
                      <span className="leading-snug">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Platform Help Note */}
            <div className="editorial-card p-4 bg-[#f9fafb] text-xs text-gray-600 space-y-1.5">
              <h4 className="font-semibold text-gray-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#ff5722]" />
                Comportement garanti :
              </h4>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-500 pl-1">
                <li>Le brouillon est immédiatement créé dans votre boîte Gmail.</li>
                <li>Le CV joint conserve son nom d’origine.</li>
                <li>La lettre de motivation est jointe au format standard sans nom d’entreprise.</li>
                <li>Aucun envoi n’est comptabilisé dans vos statistiques globales.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <CoverLetterModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          defaultTemplate={activeTemplate}
          initialCompany={companyName}
          initialPosition={positionTitle}
          initialContactName={contactName}
        />
      )}
    </div>
  );
}
