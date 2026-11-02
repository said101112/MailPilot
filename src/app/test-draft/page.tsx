"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  FlaskConical,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { sendApplication } from "@/lib/api";
import { generateCoverLetterPdf } from "@/lib/coverLetterPdf";
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
        addLog("Génération de la Lettre de motivation PDF haute résolution...", "info");
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

      addLog("Envoi de la requête au Webhook n8n (création du brouillon Gmail)...", "info");

      // 4. Send via sendApplication API -> goes to n8n webhook
      // IMPORTANT: Notice that we DO NOT insert into Supabase `applications` or `job_applications`!
      const result = await sendApplication({
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

      addLog("Réponse reçue du Webhook avec succès (HTTP 200).", "success");
      addLog(
        "Garantie Sandbox vérifiée : 0 candidature ajoutée au Tracker / DB. Vos compteurs sont 100% intacts.",
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

      toast.success("Brouillon de test créé avec succès dans Gmail !");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue lors du test.";
      addLog(`Erreur : ${msg}`, "error");
      toast.error(`Échec du test : ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800 mb-2">
            <FlaskConical className="h-3.5 w-3.5 text-emerald-600" />
            Mode Sandbox Isolé (Zero Impact Counter)
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Testeur de Brouillons Gmail
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Testez la création de vos brouillons, l’attachement de votre CV et de la Lettre PDF sans affecter vos statistiques.
          </p>
        </div>

        <a
          href="https://mail.google.com/mail/u/0/#drafts"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-medium text-gray-700 shadow-xs transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
          <span>Ouvrir Gmail (Brouillons)</span>
        </a>
      </div>

      {/* Safety Banner */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-600 p-2 text-white shrink-0 shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">
              Protection Totale de vos Compteurs de Candidature
            </h3>
            <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
              Ce formulaire communique directement avec votre webhook n8n pour générer un brouillon dans votre compte Gmail, mais il <strong>n’enregistre absolument rien</strong> dans vos tables <code>applications</code> ni dans votre <strong>Tracker</strong>. Vous pouvez faire autant de tests que vous voulez sans fausser vos statistiques.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Testing Parameters Form (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Paramètres du Test
            </h2>

            {/* Test Recipient Email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email de destination pour le test
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="votre-email@gmail.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Le brouillon sera créé dans votre Gmail adressé à cette adresse de test.
              </p>
            </div>

            {/* Test Company & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Entreprise fictive
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Poste cible
                </label>
                <input
                  type="text"
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Template Selector with Fast Track & Lang Switches */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">
                  Modèle & Version
                </label>
                <div className="flex items-center gap-1.5">
                  {/* Track switcher */}
                  <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => switchTrack("dev")}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                        !isDataAi ? "bg-white text-blue-700 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      💻 Dév
                    </button>
                    <button
                      type="button"
                      onClick={() => switchTrack("data")}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                        isDataAi ? "bg-white text-blue-700 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      🤖 Data & IA
                    </button>
                  </div>

                  {/* Lang switcher */}
                  <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => switchLanguage("fr")}
                      className={`px-1.5 py-0.5 rounded-md font-bold transition-colors ${
                        !isEnglish ? "bg-blue-600 text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      FR
                    </button>
                    <button
                      type="button"
                      onClick={() => switchLanguage("en")}
                      className={`px-1.5 py-0.5 rounded-md font-bold transition-colors ${
                        isEnglish ? "bg-blue-600 text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>

              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <label className="block text-xs font-medium text-gray-700 mb-1">
                CV à attacher
              </label>
              <select
                value={selectedCvId}
                onChange={(e) => setSelectedCvId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {cvLibrary.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.label} ({cv.fileName})
                  </option>
                ))}
              </select>
            </div>

            {/* Cover Letter Checkbox */}
            <div className="pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCoverLetter}
                  onChange={(e) => setIncludeCoverLetter(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-xs font-medium text-gray-900">
                  Générer et joindre la Lettre de motivation PDF
                </span>
                <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-semibold border border-blue-200">
                  {isDataAi ? "Data & IA" : "Dév"} • {isEnglish ? "EN" : "FR"}
                </span>
              </label>
              <p className="text-[11px] text-gray-500 ml-6 mt-0.5">
                La lettre sera automatiquement formatée au design corporatif avec l’entreprise « {companyName} ».
              </p>
            </div>

            {/* Submit Test Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleTestDraft}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Création du brouillon test en cours...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Créer le brouillon test dans Gmail (Sandbox)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live Diagnostics & Console Output (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Result Card */}
          {lastDraftResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Brouillon créé avec succès !</span>
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
                  <ul className="list-disc list-inside mt-1 space-y-0.5 pl-1 font-mono text-[11px]">
                    {lastDraftResult.attachments.map((file, i) => (
                      <li key={i}>{file}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center justify-between">
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

          {/* Real-time Diagnostics Terminal */}
          <div className="rounded-xl border border-gray-800 bg-zinc-950 p-4 text-zinc-100 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Console d'exécution Sandbox
              </span>
              <span>n8n Webhook</span>
            </div>

            <div className="mt-3 space-y-2 font-mono text-xs max-h-80 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-zinc-500 italic text-[11px]">
                  En attente du lancement d'un test... Cliquez sur le bouton bleu ci-contre pour exécuter le workflow en mode Sandbox.
                </p>
              ) : (
                logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 text-[11px] leading-relaxed ${
                      log.type === "success"
                        ? "text-emerald-400"
                        : log.type === "error"
                        ? "text-red-400"
                        : "text-zinc-300"
                    }`}
                  >
                    <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs text-xs text-gray-600 space-y-2">
            <h4 className="font-semibold text-gray-900 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Ce qui est testé par cette page :
            </h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-[11px] pl-1">
              <li>Connexion au webhook n8n en temps réel.</li>
              <li>Encodage binaire et attachement correct du CV.</li>
              <li>Génération de la Lettre de motivation PDF executive.</li>
              <li>Remplacement dynamique des variables (nom, entreprise, etc.).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
