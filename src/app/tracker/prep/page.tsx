"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Edit3,
  ExternalLink,
  Flame,
  Globe,
  HelpCircle,
  Lightbulb,
  MapPin,
  MessageSquare,
  Mic,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Shuffle,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import { listCompanies, listApplications } from "@/lib/tracker/queries";
import type { CompanyRow, JobApplicationRow } from "@/lib/tracker/types";
import {
  DEFAULT_PREP_DATA,
  loadInterviewPrep,
  saveInterviewPrep,
  SECTOR_PRESETS,
  type CompanyPrepItem,
  type InterviewPrepState,
  type PitchData,
  type QuestionAnswerItem,
  type StrategicQuestionItem,
} from "@/lib/tracker/interviewPrep";

export default function InterviewPrepPage() {
  const [prepData, setPrepData] = useState<InterviewPrepState>(DEFAULT_PREP_DATA);
  const [activeTab, setActiveTab] = useState<"company" | "practice" | "strategic" | "pitch" | "qa">("company");
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Database companies and applications from Supabase
  const [dbCompanies, setDbCompanies] = useState<CompanyRow[]>([]);
  const [dbApplications, setDbApplications] = useState<JobApplicationRow[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // Pitch timer
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Practice Simulator State
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceTimer, setPracticeTimer] = useState(60);
  const [isPracticeTimerRunning, setIsPracticeTimerRunning] = useState(false);
  const [showPracticeAnswer, setShowPracticeAnswer] = useState(false);

  // Company Sheet & Modal states
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("cs-demo");
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [modalSelectedDbCompanyId, setModalSelectedDbCompanyId] = useState<string>("");
  const [modalCustomCompanyName, setModalCustomCompanyName] = useState<string>("");
  const [modalRoleTitle, setModalRoleTitle] = useState<string>("Stage PFE - Ingénieur Data Science & IA");
  const [modalSectorKey, setModalSectorKey] = useState<string>("fintech");
  const [modalStrongPointsText, setModalStrongPointsText] = useState<string>("");
  const [modalQuestionsText, setModalQuestionsText] = useState<string>("");

  // Strategic Question modal
  const [isAddingQuestionModal, setIsAddingQuestionModal] = useState(false);
  const [newQuestionCategory, setNewQuestionCategory] = useState<StrategicQuestionItem["category"]>("architecture");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionImpact, setNewQuestionImpact] = useState("");

  // Load Database Companies & Applications
  const loadDbData = useCallback(async () => {
    try {
      setLoadingDb(true);
      const [companies, apps] = await Promise.all([
        listCompanies(),
        listApplications(),
      ]);
      setDbCompanies(companies);
      setDbApplications(apps);
    } catch (err) {
      console.warn("Could not load db companies:", err);
    } finally {
      setLoadingDb(false);
    }
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadInterviewPrep();
    setPrepData(loaded);
    if (loaded.companySheets.length > 0) {
      setSelectedCompanyId(loaded.companySheets[0].id);
    }
    void loadDbData();
  }, [loadDbData]);

  // Save changes
  const updateState = (updater: (prev: InterviewPrepState) => InterviewPrepState) => {
    setPrepData((prev) => {
      const next = updater(prev);
      saveInterviewPrep(next);
      return next;
    });
  };

  // 2-Minute Pitch practice timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((sec) => sec - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      toast.info("⏱️ 2 minutes écoulées ! Votre pitch est-il terminé ?");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  // Practice flashcard timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPracticeTimerRunning && practiceTimer > 0) {
      interval = setInterval(() => {
        setPracticeTimer((t) => t - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPracticeTimerRunning, practiceTimer]);

  const copyToClipboard = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copié dans le presse-papier !");
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Practice Pool (Combine QA items and strategic questions)
  const practicePool = useMemo(() => {
    return [...prepData.qaList];
  }, [prepData.qaList]);

  const currentPracticeItem = useMemo(() => {
    if (practicePool.length === 0) return null;
    return practicePool[practiceIndex % practicePool.length];
  }, [practicePool, practiceIndex]);

  const handleNextPracticeQuestion = () => {
    setShowPracticeAnswer(false);
    setPracticeTimer(60);
    setIsPracticeTimerRunning(false);
    setPracticeIndex((prev) => (prev + 1) % practicePool.length);
  };

  const handleScorePractice = (status: "mastered" | "review" | "difficult") => {
    if (!currentPracticeItem) return;
    updateState((prev) => ({
      ...prev,
      practiceScores: {
        ...(prev.practiceScores || {}),
        [currentPracticeItem.id]: status,
      },
    }));
    toast.success(
      status === "mastered"
        ? "Bravo ! Question marquée comme maîtrisée."
        : status === "review"
          ? "Noté ! À approfondir."
          : "Question à retravailler prioritairement."
    );
    handleNextPracticeQuestion();
  };

  const activeCompany = useMemo(() => {
    return (
      prepData.companySheets.find((c) => c.id === selectedCompanyId) ||
      prepData.companySheets[0] ||
      null
    );
  }, [prepData.companySheets, selectedCompanyId]);

  // Readiness Score Computation
  const readinessStats = useMemo(() => {
    const checklist = prepData.readinessChecklist || {};
    let score = 20; // baseline
    if (checklist.pitch_ready) score += 25;
    if (checklist.star_practiced) score += 20;
    if (checklist.strategic_chosen) score += 20;
    if (checklist.company_researched) score += 15;

    const masteredCount = Object.values(prepData.practiceScores || {}).filter(
      (v) => v === "mastered"
    ).length;

    return {
      score: Math.min(100, score),
      masteredCount,
      totalQuestions: prepData.qaList.length,
      checklist,
    };
  }, [prepData.readinessChecklist, prepData.practiceScores, prepData.qaList.length]);

  const toggleChecklistItem = (key: string) => {
    updateState((prev) => {
      const current = prev.readinessChecklist || {};
      const nextVal = !current[key];
      return {
        ...prev,
        readinessChecklist: {
          ...current,
          [key]: nextVal,
        },
      };
    });
  };

  // Open Create Company Sheet Modal
  const handleOpenCreateModal = () => {
    if (dbCompanies.length > 0) {
      const first = dbCompanies[0];
      setModalSelectedDbCompanyId(first.id);
      setModalCustomCompanyName(first.name);

      // Pre-select role if application exists
      const relatedApp = dbApplications.find((a) => a.company_id === first.id);
      if (relatedApp) {
        setModalRoleTitle(relatedApp.position);
      } else {
        setModalRoleTitle("Stage PFE - Ingénieur Data Science & IA");
      }
    } else {
      setModalSelectedDbCompanyId("custom");
      setModalCustomCompanyName("");
      setModalRoleTitle("Stage PFE - Ingénieur Data / Tech");
    }

    // Default preset
    const preset = SECTOR_PRESETS.fintech;
    setModalSectorKey("fintech");
    setModalStrongPointsText(preset.strongPoints.join("\n"));
    setModalQuestionsText(preset.questions.join("\n"));

    setIsCreateCompanyModalOpen(true);
  };

  // When user changes company in modal dropdown
  const handleModalCompanySelect = (companyId: string) => {
    setModalSelectedDbCompanyId(companyId);
    if (companyId === "custom") {
      setModalCustomCompanyName("");
      return;
    }
    const found = dbCompanies.find((c) => c.id === companyId);
    if (found) {
      setModalCustomCompanyName(found.name);
      const relatedApp = dbApplications.find((a) => a.company_id === found.id);
      if (relatedApp) {
        setModalRoleTitle(relatedApp.position);
      }
      // Infer sector preset
      const secLower = (found.sector || "").toLowerCase();
      let matchedKey = "general";
      if (secLower.includes("finan") || secLower.includes("bank") || secLower.includes("assurance")) matchedKey = "fintech";
      else if (secLower.includes("tech") || secLower.includes("soft") || secLower.includes("saas") || secLower.includes("cloud")) matchedKey = "saas";
      else if (secLower.includes("sant") || secLower.includes("health") || secLower.includes("pharma")) matchedKey = "healthtech";
      else if (secLower.includes("commerce") || secLower.includes("retail") || secLower.includes("logist")) matchedKey = "ecommerce";
      else if (secLower.includes("defen") || secLower.includes("aero") || secLower.includes("auto") || secLower.includes("indus")) matchedKey = "defense_industry";

      setModalSectorKey(matchedKey);
      const preset = SECTOR_PRESETS[matchedKey] || SECTOR_PRESETS.general;
      setModalStrongPointsText(preset.strongPoints.join("\n"));
      setModalQuestionsText(preset.questions.join("\n"));
    }
  };

  // Magic button: apply sector preset suggestions
  const handleApplySectorPreset = (key: string) => {
    setModalSectorKey(key);
    const preset = SECTOR_PRESETS[key] || SECTOR_PRESETS.general;
    setModalStrongPointsText(preset.strongPoints.join("\n"));
    setModalQuestionsText(preset.questions.join("\n"));
    toast.info(`Suggestions appliquées pour le secteur : ${preset.label}`);
  };

  // Save new company prep sheet
  const handleSaveCompanySheet = () => {
    const finalName = modalCustomCompanyName.trim();
    if (!finalName) {
      toast.error("Veuillez renseigner le nom de l'entreprise.");
      return;
    }

    const matchedDb = dbCompanies.find(
      (c) => c.id === modalSelectedDbCompanyId || c.name.toLowerCase() === finalName.toLowerCase()
    );

    const strongPoints = modalStrongPointsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const tailoredQuestions = modalQuestionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const newSheet: CompanyPrepItem = {
      id: `cs-${Date.now()}`,
      companyId: matchedDb?.id || null,
      companyName: finalName,
      domain: matchedDb?.domain || null,
      logoUrl: matchedDb?.logo_url || null,
      website: matchedDb?.website || null,
      sector: SECTOR_PRESETS[modalSectorKey]?.label || matchedDb?.sector || "Tech",
      location: matchedDb?.location || null,
      roleTitle: modalRoleTitle.trim() || "Stage PFE - Ingénieur Data / Tech",
      strongPoints: strongPoints.length > 0 ? strongPoints : ["Leur expertise et leur dynamique de croissance"],
      keyChallenges: "Scalabilité et traitement de flux de données.",
      tailoredQuestions: tailoredQuestions.length > 0 ? tailoredQuestions : ["Quelle est votre plus grande dette technique actuelle ?"],
      liveNotes: "",
      updatedAt: new Date().toISOString(),
    };

    updateState((prev) => ({
      ...prev,
      companySheets: [newSheet, ...prev.companySheets],
    }));

    setSelectedCompanyId(newSheet.id);
    setIsCreateCompanyModalOpen(false);
    toast.success(`Fiche préparatoire créée pour ${finalName} !`);
  };

  const handleDeleteCompanySheet = (id: string) => {
    if (!window.confirm("Supprimer cette fiche préparatoire ?")) return;
    updateState((prev) => {
      const remaining = prev.companySheets.filter((c) => c.id !== id);
      return {
        ...prev,
        companySheets: remaining,
      };
    });
    toast.info("Fiche supprimée.");
  };

  const handleUpdateCompanyNotes = (notes: string) => {
    if (!activeCompany) return;
    updateState((prev) => ({
      ...prev,
      companySheets: prev.companySheets.map((c) =>
        c.id === activeCompany.id
          ? { ...c, liveNotes: notes, updatedAt: new Date().toISOString() }
          : c
      ),
    }));
  };

  return (
    <div className={cn("page-shell min-h-screen", isReadingMode && "bg-[#faf9f6]")}>
      <div className="mx-auto max-w-[980px] space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-[#ff5722] text-base shadow-2xs">
                🧠
              </span>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Aide-Mémoire & Questions Stratégiques
              </h1>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Votre hub complet avant entretien : fiches entreprises connectées à votre base, simulateur d&apos;entraînement et questions à poser.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsReadingMode((prev) => !prev);
                toast.info(
                  !isReadingMode
                    ? "📱 Mode Révision activé (Lecture aérée pour les transports & mobile)"
                    : "Mode Standard rétabli"
                );
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition border cursor-pointer",
                isReadingMode
                  ? "bg-[#ff5722] text-white border-[#ff5722] shadow-xs"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
              title="Affichage optimisé pour réviser dans le train ou 5 min avant l'appel"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{isReadingMode ? "Mode Révision Activé" : "Mode En Route (Lecture)"}</span>
            </button>
          </div>
        </div>

        {/* Readiness Insights Banner */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff5722] border border-orange-100 font-bold">
                <span className="text-base font-extrabold">{readinessStats.score}%</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">
                    Niveau de Préparation d&apos;Entretien
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {readinessStats.score >= 80 ? "🔥 Prêt pour l'appel" : "⚡ En progression"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {readinessStats.masteredCount} question(s) maîtrisée(s) · {prepData.companySheets.length} fiche(s) entreprise prête(s).
                </p>
              </div>
            </div>

            {/* Interactive Checklist Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                { key: "pitch_ready", label: "Pitch 2 min" },
                { key: "star_practiced", label: "Méthode STAR" },
                { key: "strategic_chosen", label: "Questions Wow" },
                { key: "company_researched", label: "Fiche Entreprise" },
              ].map((item) => {
                const isChecked = Boolean(readinessStats.checklist[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleChecklistItem(item.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer",
                      isChecked
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    <CheckCircle2
                      className={cn(
                        "h-3.5 w-3.5",
                        isChecked ? "text-emerald-600" : "text-gray-400"
                      )}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("company")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer",
              activeTab === "company"
                ? "bg-[#fff3ef] text-[#ff5722] shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <Building2 className="h-4 w-4" />
            <span>Fiches Entreprises ({prepData.companySheets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("practice")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer",
              activeTab === "practice"
                ? "bg-[#fff3ef] text-[#ff5722] shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <Shuffle className="h-4 w-4 text-[#ff5722]" />
            <span>Simulateur d&apos;Entraînement</span>
            <span className="rounded-full bg-orange-100 px-1.5 py-0.2 text-[10px] text-[#ff5722] font-bold">
              Flashcards
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("strategic")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer",
              activeTab === "strategic"
                ? "bg-[#fff3ef] text-[#ff5722] shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span>Questions Stratégiques (Effet WOW)</span>
            <span className="rounded-full bg-gray-200 px-1.5 py-0.2 text-[10px] text-gray-700 font-bold">
              {prepData.strategicQuestions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pitch")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer",
              activeTab === "pitch"
                ? "bg-[#fff3ef] text-[#ff5722] shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <Mic className="h-4 w-4" />
            <span>Mon Pitch (2 min chrono)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("qa")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer",
              activeTab === "qa"
                ? "bg-[#fff3ef] text-[#ff5722] shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <Target className="h-4 w-4" />
            <span>Réponses Méthode STAR</span>
          </button>
        </div>

        {/* TAB 1: FICHE ENTREPRISE & BLOC-NOTES (LINKED TO SUPABASE COMPANIES) */}
        {activeTab === "company" && (
          <div className="space-y-4">
            {/* Toolbar: Select company + Create button */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                {activeCompany && (
                  <CompanyLogo
                    name={activeCompany.companyName}
                    domain={activeCompany.domain}
                    logoUrl={activeCompany.logoUrl}
                    className="h-9 w-9 shrink-0"
                  />
                )}
                <div className="flex-1">
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="editorial-input text-xs font-bold w-full cursor-pointer bg-white"
                  >
                    {prepData.companySheets.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} — {c.roleTitle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="editorial-button-primary h-9 px-3.5 text-xs flex items-center gap-1.5 cursor-pointer font-bold shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouvelle fiche entreprise</span>
                </button>
              </div>
            </div>

            {/* Active Company View */}
            {activeCompany && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5 shadow-xs">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3.5">
                    <CompanyLogo
                      name={activeCompany.companyName}
                      domain={activeCompany.domain}
                      logoUrl={activeCompany.logoUrl}
                      className="h-12 w-12 shrink-0 rounded-xl"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-gray-900">
                          {activeCompany.companyName}
                        </h2>
                        {activeCompany.sector && (
                          <span className="rounded-full bg-orange-100/80 px-2.5 py-0.5 text-[11px] font-bold text-[#ff5722]">
                            {activeCompany.sector}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-medium">
                        {activeCompany.roleTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">
                      Modifié le {new Date(activeCompany.updatedAt).toLocaleDateString("fr-FR")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCompanySheet(activeCompany.id)}
                      className="rounded-lg p-2 text-gray-400 hover:text-red-600 transition cursor-pointer"
                      title="Supprimer cette fiche"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Points forts de l'entreprise à citer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span>Points forts & actualités de l&apos;entreprise à citer</span>
                    </h4>
                    <span className="text-[11px] text-gray-400">À mentionner pour flatter l&apos;équipe</span>
                  </div>
                  <div className="space-y-1.5">
                    {activeCompany.strongPoints.map((pt, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 text-xs text-gray-800 leading-relaxed font-medium"
                      >
                        <span className="text-[#ff5722] font-bold">•</span>
                        <span className="flex-1">{pt}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(pt, `pt-${i}`)}
                          className="text-gray-400 hover:text-gray-800 cursor-pointer"
                        >
                          {copiedId === `pt-${i}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Questions adaptées à leur poser */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-[#ff5722]" />
                      <span>Questions spécifiques à leur poser à la fin de l&apos;appel</span>
                    </h4>
                    <span className="text-[11px] text-[#ff5722] font-semibold">Effet WOW garanti</span>
                  </div>
                  <div className="space-y-2">
                    {activeCompany.tailoredQuestions.map((q, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-orange-50/60 border border-orange-200/80 text-xs font-semibold text-gray-900"
                      >
                        <span className="flex-1 pr-3">« {q} »</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(q, `co-q-${i}`)}
                          className="rounded-lg bg-white p-1.5 border border-orange-200 text-gray-600 hover:text-[#ff5722] cursor-pointer shadow-2xs"
                        >
                          {copiedId === `co-q-${i}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Notes During/After Interview */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Edit3 className="h-4 w-4 text-gray-600" />
                      <span>Bloc-Notes en direct (pendant ou après l&apos;appel)</span>
                    </h4>
                    <span className="text-[11px] text-gray-400">Sauvegarde automatique</span>
                  </div>
                  <textarea
                    className="editorial-textarea min-h-[140px] w-full text-xs font-medium leading-relaxed p-3.5"
                    placeholder="Notez ici les questions techniques posées par le recruteur, la grille de rémunération évoquée, la date du prochain entretien, noms et coordonnées des interlocuteurs..."
                    value={activeCompany.liveNotes}
                    onChange={(e) => handleUpdateCompanyNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SIMULATEUR D'ENTRAÎNEMENT INTERACTIF (FLASHCARDS PRACTICE) */}
        {activeTab === "practice" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-[#fff3ef] to-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Shuffle className="h-5 w-5 text-[#ff5722]" />
                  <span>Simulateur d&apos;Entretien : Flashcards Aléatoires</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Prenez 60 secondes pour répondre à voix haute comme en vrai entretien, puis vérifiez vos points clés.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-orange-300 bg-white px-3.5 py-1.5 font-mono text-xl font-bold text-[#ff5722] shadow-xs">
                  {practiceTimer}s
                </div>
                <button
                  type="button"
                  onClick={() => setIsPracticeTimerRunning((p) => !p)}
                  className="editorial-button-secondary h-9 px-3 text-xs font-semibold cursor-pointer"
                >
                  {isPracticeTimerRunning ? "Pause" : "Chrono 60s"}
                </button>
                <button
                  type="button"
                  onClick={handleNextPracticeQuestion}
                  className="editorial-button-primary h-9 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  <span>Question Suivante</span>
                </button>
              </div>
            </div>

            {currentPracticeItem && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 uppercase">
                    {currentPracticeItem.category}
                  </span>
                  <span className="text-xs text-gray-400">
                    Question {(practiceIndex % practicePool.length) + 1} sur {practicePool.length}
                  </span>
                </div>

                <div className="py-2">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                    Question posée par le recruteur :
                  </p>
                  <h3 className="text-lg font-extrabold text-gray-900 leading-snug">
                    « {currentPracticeItem.question} »
                  </h3>
                </div>

                {!showPracticeAnswer ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <p className="text-xs text-gray-500 mb-3">
                      Répondez à voix haute sans regarder la correction...
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPracticeAnswer(true)}
                      className="editorial-button-primary h-10 px-5 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      💡 Dévoiler la réponse type & points clés
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="rounded-xl bg-orange-50/70 border border-orange-200 p-4 text-xs space-y-3">
                      <p className="font-bold text-[#ff5722] flex items-center gap-1.5">
                        <Check className="h-4 w-4" />
                        <span>Structure de réponse recommandée :</span>
                      </p>
                      {currentPracticeItem.fullAnswer && (
                        <p className="text-gray-800 leading-relaxed font-medium">
                          {currentPracticeItem.fullAnswer}
                        </p>
                      )}
                      {currentPracticeItem.situation && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className="bg-white p-2.5 rounded-lg border border-orange-100">
                            <strong className="block text-gray-900">S (Situation) :</strong>
                            <span>{currentPracticeItem.situation}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-orange-100">
                            <strong className="block text-gray-900">T (Tâche) :</strong>
                            <span>{currentPracticeItem.task}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-orange-100">
                            <strong className="block text-gray-900">A (Action) :</strong>
                            <span>{currentPracticeItem.action}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-orange-100">
                            <strong className="block text-gray-900">R (Résultat) :</strong>
                            <span>{currentPracticeItem.result}</span>
                          </div>
                        </div>
                      )}
                      {currentPracticeItem.keyTip && (
                        <p className="text-[11px] text-gray-600 flex items-center gap-1.5 pt-1">
                          <Lightbulb className="h-3.5 w-3.5 text-[#ff5722]" />
                          <span>{currentPracticeItem.keyTip}</span>
                        </p>
                      )}
                    </div>

                    {/* Self Assessment Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <p className="text-xs font-semibold text-gray-700">
                        Comment avez-vous trouvé votre réponse ?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleScorePractice("mastered")}
                          className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                        >
                          🟢 Maîtrisé
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScorePractice("review")}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition cursor-pointer"
                        >
                          🟡 À approfondir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScorePractice("difficult")}
                          className="px-3.5 py-2 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-bold hover:bg-red-100 transition cursor-pointer"
                        >
                          🔴 Difficile / À revoir
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: QUESTIONS STRATÉGIQUES À POSER (EFFET WOW) */}
        {activeTab === "strategic" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une question, architecture, dette technique..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="editorial-input !pl-9 text-xs w-full"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsAddingQuestionModal(true)}
                className="editorial-button-primary h-9 px-3.5 text-xs flex items-center gap-1.5 cursor-pointer font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter ma question</span>
              </button>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-1">
              {prepData.strategicQuestions
                .filter((q) => !searchQuery || q.question.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 transition shadow-2xs hover:border-orange-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-md bg-orange-100/80 px-2 py-0.5 text-[10.5px] font-bold text-[#ff5722] uppercase tracking-wide">
                            {item.category === "architecture"
                              ? "🛠️ Architecture & Tech"
                              : item.category === "success_metrics"
                                ? "🎯 Critères de Succès"
                                : item.category === "team_culture"
                                  ? "🤝 Organisation & Équipe"
                                  : "🚀 Vision & Business"}
                          </span>
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <p className="font-semibold text-gray-900 text-sm leading-relaxed">
                          « {item.question} »
                        </p>

                        <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5 text-xs text-gray-600 flex items-start gap-2">
                          <Flame className="h-3.5 w-3.5 text-[#ff5722] shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-gray-900">Pourquoi cette question fait mouche : </strong>
                            <span>{item.impactReason}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.question, item.id)}
                        className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:text-[#ff5722] hover:border-orange-200 transition cursor-pointer"
                        title="Copier la question"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 4: PITCH EN 2 MINUTES CHRONO */}
        {activeTab === "pitch" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-[#fff3ef] to-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff5722] text-white shadow-xs">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Entraînement Pitch 2 Minutes
                  </h3>
                  <p className="text-xs text-gray-500">
                    Chronométrez-vous à voix haute. Ne dépassez jamais 2 minutes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-orange-300 bg-white px-4 py-2 text-center shadow-xs">
                  <span className="font-mono text-2xl font-extrabold text-[#ff5722]">
                    {Math.floor(timerSeconds / 60)}:
                    {(timerSeconds % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTimerRunning((p) => !p)}
                  className={cn(
                    "editorial-button-primary h-10 px-4 text-xs flex items-center gap-1.5 cursor-pointer font-bold",
                    isTimerRunning ? "bg-amber-600 hover:bg-amber-700" : "bg-[#ff5722]"
                  )}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="h-4 w-4" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Démarrer</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(120);
                  }}
                  className="editorial-button-secondary h-10 px-3 text-xs flex items-center gap-1 text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Pitch Editor */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="text-sm font-bold text-gray-900">Structure du Pitch</h4>
                <button
                  type="button"
                  onClick={() => {
                    const fullText = `${prepData.pitch.hook}\n\n${prepData.pitch.background}\n\n${prepData.pitch.keyProjects}\n\n${prepData.pitch.whyThisCompany}\n\n${prepData.pitch.conclusion}`;
                    copyToClipboard(fullText, "full-pitch");
                  }}
                  className="text-xs text-[#ff5722] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copier l&apos;intégralité</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700">
                  1. L&apos;Accroche (15 secondes - Qui je suis)
                </label>
                <textarea
                  className="editorial-textarea min-h-[70px] w-full text-xs font-medium"
                  value={prepData.pitch.hook}
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      pitch: { ...prev.pitch, hook: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700">
                  2. Le Socle Technique (30 secondes - Mes piliers d&apos;expertise)
                </label>
                <textarea
                  className="editorial-textarea min-h-[70px] w-full text-xs font-medium"
                  value={prepData.pitch.background}
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      pitch: { ...prev.pitch, background: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700">
                  3. Le Projet Phare (45 secondes - Preuve concrète de résultat)
                </label>
                <textarea
                  className="editorial-textarea min-h-[85px] w-full text-xs font-medium"
                  value={prepData.pitch.keyProjects}
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      pitch: { ...prev.pitch, keyProjects: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700">
                  4. Pourquoi vous et ce poste (20 secondes - L&apos;alignement)
                </label>
                <textarea
                  className="editorial-textarea min-h-[70px] w-full text-xs font-medium"
                  value={prepData.pitch.whyThisCompany}
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      pitch: { ...prev.pitch, whyThisCompany: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700">
                  5. Conclusion (10 secondes)
                </label>
                <textarea
                  className="editorial-textarea min-h-[60px] w-full text-xs font-medium"
                  value={prepData.pitch.conclusion}
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      pitch: { ...prev.pitch, conclusion: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MÉTHODE STAR */}
        {activeTab === "qa" && (
          <div className="space-y-4">
            <div className="grid gap-4">
              {prepData.qaList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase">
                        {item.category}
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 mt-1">
                        {item.question}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const content = item.fullAnswer || `S: ${item.situation}\nT: ${item.task}\nA: ${item.action}\nR: ${item.result}`;
                        copyToClipboard(content, item.id);
                      }}
                      className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-[#ff5722] cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {item.fullAnswer && (
                    <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-800 leading-relaxed font-medium">
                      {item.fullAnswer}
                    </div>
                  )}

                  {item.situation && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
                        <strong className="text-amber-950 block mb-0.5">S · Situation</strong>
                        <span className="text-amber-900">{item.situation}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                        <strong className="text-blue-950 block mb-0.5">T · Tâche</strong>
                        <span className="text-blue-900">{item.task}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                        <strong className="text-emerald-950 block mb-0.5">A · Action</strong>
                        <span className="text-emerald-900">{item.action}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-100">
                        <strong className="text-purple-950 block mb-0.5">R · Résultat</strong>
                        <span className="text-purple-900">{item.result}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL HAUT DE GAMME: CRÉATION FICHE ENTREPRISE LINKÉE À SUPABASE */}
      {isCreateCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsCreateCompanyModalOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff3ef] text-[#ff5722]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Créer une Fiche Préparatoire d&apos;Entreprise
                  </h3>
                  <p className="text-xs text-gray-500">
                    Liez une entreprise de votre base ou créez une fiche sur-mesure
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCompanyModalOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Option 1: Choisir depuis la base Supabase */}
              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <DatabaseIcon className="h-3.5 w-3.5 text-gray-400" />
                  <span>Entreprise dans votre base (Tracker)</span>
                </label>
                <select
                  value={modalSelectedDbCompanyId}
                  onChange={(e) => handleModalCompanySelect(e.target.value)}
                  className="editorial-input text-xs w-full font-medium bg-white"
                >
                  {dbCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.name} {c.sector ? `(${c.sector})` : ""}
                    </option>
                  ))}
                  <option value="custom">✏️ Autre entreprise (Saisie manuelle libre)...</option>
                </select>
              </div>

              {/* Nom de l'entreprise si custom */}
              {modalSelectedDbCompanyId === "custom" && (
                <div className="space-y-1.5">
                  <label className="editorial-label text-xs font-semibold text-gray-700">
                    Nom de l&apos;entreprise *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : Thales, Doctolib, Société Générale..."
                    value={modalCustomCompanyName}
                    onChange={(e) => setModalCustomCompanyName(e.target.value)}
                    className="editorial-input text-xs w-full font-medium"
                    required
                  />
                </div>
              )}

              {/* Intitulé du poste */}
              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700">
                  Intitulé du poste visé
                </label>
                <input
                  type="text"
                  placeholder="Ex : Stage PFE - Ingénieur Data Science & IA"
                  value={modalRoleTitle}
                  onChange={(e) => setModalRoleTitle(e.target.value)}
                  className="editorial-input text-xs w-full font-medium"
                />
              </div>

              {/* Secteur d'activité avec bouton de suggestions magiques */}
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#ff5722]" />
                    <span>Secteur & Suggestions Magiques :</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Object.entries(SECTOR_PRESETS).map(([key, item]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleApplySectorPreset(key)}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10.5px] font-semibold border transition cursor-pointer",
                          modalSectorKey === key
                            ? "bg-[#ff5722] text-white border-[#ff5722] shadow-2xs"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        {item.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Cliquez sur un secteur ci-dessus pour pré-remplir les arguments clés et les questions percutantes adaptées.
                </p>
              </div>

              {/* Points forts */}
              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>Points forts & actualités à citer (1 par ligne)</span>
                  <span className="text-[11px] text-gray-400 font-normal">Pour flatter l&apos;entreprise</span>
                </label>
                <textarea
                  className="editorial-textarea min-h-[90px] w-full text-xs font-medium leading-relaxed"
                  value={modalStrongPointsText}
                  onChange={(e) => setModalStrongPointsText(e.target.value)}
                  placeholder="Leur position de leader..."
                />
              </div>

              {/* Questions adaptées */}
              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>Questions spécifiques à leur poser (1 par ligne)</span>
                  <span className="text-[11px] text-gray-400 font-normal">Questions percutantes</span>
                </label>
                <textarea
                  className="editorial-textarea min-h-[90px] w-full text-xs font-medium leading-relaxed"
                  value={modalQuestionsText}
                  onChange={(e) => setModalQuestionsText(e.target.value)}
                  placeholder="Comment gérez-vous la dette technique..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 px-6 py-4 bg-gray-50/80">
              <button
                type="button"
                onClick={() => setIsCreateCompanyModalOpen(false)}
                className="editorial-button-secondary h-9 px-4 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveCompanySheet}
                className="editorial-button-primary h-9 px-5 text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Créer la fiche entreprise</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}
