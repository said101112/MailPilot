"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Code2,
  Compass,
  Copy,
  Cpu,
  Database,
  Edit3,
  ExternalLink,
  Eye,
  Flame,
  Globe,
  HelpCircle,
  Layers,
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
  Share2,
  Shuffle,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Terminal,
  Timer,
  Trash2,
  TrendingUp,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import ForumCompanyNotebook from "@/components/tracker/ForumCompanyNotebook";
import { listCompanies, listApplications } from "@/lib/tracker/queries";
import type { CompanyRow, JobApplicationRow } from "@/lib/tracker/types";
import {
  DEFAULT_PREP_DATA,
  generateAIPrompt,
  loadInterviewPrep,
  parseAIResponse,
  PROMPT_DOMAIN_PRESETS,
  saveInterviewPrep,
  SECTOR_PRESETS,
  type AIPromptOptions,
  type CompanyPrepItem,
  type InterviewPrepState,
  type PitchData,
  type QuestionAnswerItem,
  type StrategicQuestionItem,
} from "@/lib/tracker/interviewPrep";

function renderDomainPresetIcon(iconType?: string) {
  switch (iconType) {
    case "brain":
      return <Brain className="h-3.5 w-3.5 text-[#ff5722]" />;
    case "terminal":
      return <Terminal className="h-3.5 w-3.5 text-emerald-600" />;
    case "database":
      return <Database className="h-3.5 w-3.5 text-blue-600" />;
    case "chart":
      return <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />;
    case "cpu":
      return <Cpu className="h-3.5 w-3.5 text-purple-600" />;
    case "eye":
      return <Eye className="h-3.5 w-3.5 text-cyan-600" />;
    case "layers":
      return <Layers className="h-3.5 w-3.5 text-amber-600" />;
    case "cloud":
      return <Cloud className="h-3.5 w-3.5 text-sky-600" />;
    case "target":
      return <Target className="h-3.5 w-3.5 text-rose-600" />;
    default:
      return <Sparkles className="h-3.5 w-3.5 text-[#ff5722]" />;
  }
}

export default function InterviewPrepPage() {
  const [prepData, setPrepData] = useState<InterviewPrepState>(DEFAULT_PREP_DATA);
  const [activeTab, setActiveTab] = useState<
    "flashcards" | "prompt_studio" | "forum_notes" | "company" | "strategic" | "pitch" | "qa"
  >("flashcards");
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

  // Flashcards Simulator & Flip Card State
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceTimerMax, setPracticeTimerMax] = useState(60);
  const [practiceTimer, setPracticeTimer] = useState(60);
  const [isPracticeTimerRunning, setIsPracticeTimerRunning] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>("all");

  // AI Prompt Studio & Smart Paste State
  const [promptDomain, setPromptDomain] = useState("Data Science & Machine Learning");
  const [promptLanguage, setPromptLanguage] = useState<"fr" | "en">("fr");
  const [promptCount, setPromptCount] = useState(20);
  const [promptSeniority, setPromptSeniority] = useState<"internship_pfe" | "junior" | "mid">("internship_pfe");
  const [promptFocus, setPromptFocus] = useState<"all" | "technical" | "behavioral" | "difficult">("all");
  const [pastedAIResponse, setPastedAIResponse] = useState("");
  const [isPromptImportModalOpen, setIsPromptImportModalOpen] = useState(false);

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

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "forum" || tabParam === "forum_notes") {
        setActiveTab("forum_notes");
      }
    }
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
    } else if (practiceTimer === 0 && isPracticeTimerRunning) {
      setIsPracticeTimerRunning(false);
      toast.info("⏱️ Temps écoulé ! Retournez la carte pour voir la réponse.");
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

  // Computed AI prompt
  const generatedPrompt = useMemo(() => {
    return generateAIPrompt({
      domain: promptDomain,
      language: promptLanguage,
      count: promptCount,
      seniority: promptSeniority,
      focus: promptFocus,
    });
  }, [promptDomain, promptLanguage, promptCount, promptSeniority, promptFocus]);

  // Distinct domains present in Q&A list
  const availableDomains = useMemo(() => {
    const set = new Set<string>();
    prepData.qaList.forEach((q) => {
      if (q.domain) set.add(q.domain);
    });
    return Array.from(set).sort();
  }, [prepData.qaList]);

  // Flashcards Practice Pool
  const filteredPracticePool = useMemo(() => {
    if (selectedDomainFilter === "all") return prepData.qaList;
    return prepData.qaList.filter((q) => q.domain === selectedDomainFilter);
  }, [prepData.qaList, selectedDomainFilter]);

  const currentPracticeItem = useMemo(() => {
    if (filteredPracticePool.length === 0) return null;
    return filteredPracticePool[practiceIndex % filteredPracticePool.length];
  }, [filteredPracticePool, practiceIndex]);

  const handleNextPracticeQuestion = () => {
    setIsCardFlipped(false);
    setPracticeTimer(practiceTimerMax);
    setIsPracticeTimerRunning(false);
    setPracticeIndex((prev) => (prev + 1) % Math.max(1, filteredPracticePool.length));
  };

  const handlePrevPracticeQuestion = () => {
    setIsCardFlipped(false);
    setPracticeTimer(practiceTimerMax);
    setIsPracticeTimerRunning(false);
    setPracticeIndex((prev) =>
      prev === 0 ? filteredPracticePool.length - 1 : prev - 1
    );
  };

  const handleShufflePractice = () => {
    setIsCardFlipped(false);
    setPracticeTimer(practiceTimerMax);
    setIsPracticeTimerRunning(false);
    const randomIndex = Math.floor(Math.random() * filteredPracticePool.length);
    setPracticeIndex(randomIndex);
    toast.info("Question tirée au sort !");
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

  // Parse preview from pasted text in Prompt Studio
  const parsedQuestionsPreview = useMemo(() => {
    return parseAIResponse(pastedAIResponse, promptDomain);
  }, [pastedAIResponse, promptDomain]);

  // Import parsed questions into prepData
  const handleImportParsedQuestions = () => {
    if (parsedQuestionsPreview.length === 0) {
      toast.error("Aucune question valide n'a pu être extraite du texte collé.");
      return;
    }

    updateState((prev) => ({
      ...prev,
      qaList: [...parsedQuestionsPreview, ...prev.qaList],
    }));

    toast.success(
      `${parsedQuestionsPreview.length} questions importées avec succès pour "${promptDomain}" !`
    );
    setPastedAIResponse("");
    setIsPromptImportModalOpen(false);
    setActiveTab("flashcards");
    setSelectedDomainFilter(promptDomain);
    setPracticeIndex(0);
    setIsCardFlipped(false);
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
    let score = 20;
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

    const preset = SECTOR_PRESETS.fintech;
    setModalSectorKey("fintech");
    setModalStrongPointsText(preset.strongPoints.join("\n"));
    setModalQuestionsText(preset.questions.join("\n"));

    setIsCreateCompanyModalOpen(true);
  };

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

  const handleApplySectorPreset = (key: string) => {
    setModalSectorKey(key);
    const preset = SECTOR_PRESETS[key] || SECTOR_PRESETS.general;
    setModalStrongPointsText(preset.strongPoints.join("\n"));
    setModalQuestionsText(preset.questions.join("\n"));
    toast.info(`Suggestions appliquées pour le secteur : ${preset.label}`);
  };

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
    updateState((prev) => ({
      ...prev,
      companySheets: prev.companySheets.filter((c) => c.id !== id),
    }));
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

  const handleDeleteQAItem = (id: string) => {
    updateState((prev) => ({
      ...prev,
      qaList: prev.qaList.filter((item) => item.id !== id),
    }));
    toast.info("Question supprimée de la banque.");
  };

  return (
    <div className={cn("page-shell min-h-screen", isReadingMode && "bg-[#faf9f6]")}>
      <div className="mx-auto max-w-[980px] space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-[#ff5722] text-base shadow-2xs">
                <Brain className="h-4.5 w-4.5 text-[#ff5722]" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Aide-Mémoire & Questions d&apos;Entretien
              </h1>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Générateur de prompt IA, import 1-clic, simulateur de cartes retournables (Flip) avec chrono et questions stratégiques.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsReadingMode((prev) => !prev);
                toast.info(
                  !isReadingMode
                    ? "Mode Révision activé (Lecture aérée pour les transports & mobile)"
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
              <Smartphone className="h-3.5 w-3.5" />
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
                    Préparation d&apos;Entretien
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 inline-flex items-center gap-1">
                    {readinessStats.score >= 80 ? (
                      <>
                        <Flame className="h-3 w-3 text-emerald-700" />
                        <span>Prêt pour l&apos;appel</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3 text-emerald-700" />
                        <span>En progression</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {readinessStats.masteredCount} question(s) maîtrisée(s) sur {readinessStats.totalQuestions} · {prepData.companySheets.length} fiche(s) entreprise.
                </p>
              </div>
            </div>

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
            onClick={() => setActiveTab("flashcards")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer",
              activeTab === "flashcards"
                ? "bg-[#fff3ef] text-[#ff5722] shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <Shuffle className="h-4 w-4" />
            <span>Mode Flip & Chrono (Flashcards)</span>
            <span className="rounded-full bg-orange-100 px-1.5 py-0.2 text-[10px] text-[#ff5722] font-bold">
              {filteredPracticePool.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("prompt_studio")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer",
              activeTab === "prompt_studio"
                ? "bg-[#fff3ef] text-[#ff5722] shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span>Générateur de Prompt IA & Import</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("forum_notes")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer",
              activeTab === "forum_notes"
                ? "bg-[#fff3ef] text-[#ff5722] shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <Building2 className="h-4 w-4 text-[#ff5722]" />
            <span>Bloc-Notes Forum Entreprises</span>
            <span className="rounded-full bg-orange-100 px-1.5 py-0.2 text-[10px] text-[#ff5722] font-bold">
              Forum
            </span>
          </button>

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
            onClick={() => setActiveTab("strategic")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer",
              activeTab === "strategic"
                ? "bg-[#fff3ef] text-[#ff5722] shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <Flame className="h-4 w-4 text-[#ff5722]" />
            <span>Questions Wow à Poser</span>
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
            <span>Mon Pitch (2 min)</span>
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
            <BookOpen className="h-4 w-4" />
            <span>Banque Complète ({prepData.qaList.length})</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: FLASHCARDS FLIP & CHRONO (MODE CARTE RETOURNABLE)                  */}
        {/* ========================================================================= */}
        {activeTab === "flashcards" && (
          <div className="space-y-4">
            {/* Toolbar: Filter domain + Timer preset + Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <Layers className="h-4 w-4 text-gray-400 shrink-0" />
                <select
                  value={selectedDomainFilter}
                  onChange={(e) => {
                    setSelectedDomainFilter(e.target.value);
                    setPracticeIndex(0);
                    setIsCardFlipped(false);
                  }}
                  className="editorial-input text-xs font-bold w-full cursor-pointer bg-white"
                >
                  <option value="all">Tous les domaines ({prepData.qaList.length} questions)</option>
                  {availableDomains.map((dom) => (
                    <option key={dom} value={dom}>
                      {dom} ({prepData.qaList.filter((q) => q.domain === dom).length})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {/* Timer Duration Presets */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-semibold text-gray-600">
                  <Clock className="h-3.5 w-3.5 text-gray-400 ml-1" />
                  {[30, 60, 90].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setPracticeTimerMax(sec);
                        setPracticeTimer(sec);
                        setIsPracticeTimerRunning(false);
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] transition cursor-pointer",
                        practiceTimerMax === sec
                          ? "bg-white text-gray-900 shadow-2xs font-bold"
                          : "hover:text-gray-900"
                      )}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleShufflePractice}
                  className="editorial-button-secondary h-8 px-2.5 text-xs flex items-center gap-1 font-semibold cursor-pointer"
                  title="Tirer au sort une question"
                >
                  <Shuffle className="h-3.5 w-3.5 text-[#ff5722]" />
                  <span>Aléatoire</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("prompt_studio")}
                  className="editorial-button-primary h-8 px-3 text-xs flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Générer d&apos;autres questions (IA)</span>
                </button>
              </div>
            </div>

            {/* FLIP CARD CONTAINER */}
            {currentPracticeItem ? (
              <div className="relative w-full min-h-[380px]">
                <div
                  className={cn(
                    "w-full rounded-3xl border transition-all duration-300 shadow-sm p-6 sm:p-8 flex flex-col justify-between",
                    !isCardFlipped
                      ? "bg-gradient-to-br from-white to-orange-50/30 border-orange-200/90"
                      : "bg-white border-emerald-200/90 ring-2 ring-emerald-400/20"
                  )}
                >
                  {/* Card Top: Index, Category, Chrono */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-[#ff5722]">
                        {currentPracticeItem.domain || "Tech"}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase">
                        {currentPracticeItem.category}
                      </span>
                      {currentPracticeItem.difficulty && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          {currentPracticeItem.difficulty}
                        </span>
                      )}
                    </div>

                    {/* Chrono display & controls */}
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "rounded-xl px-3 py-1 font-mono text-sm font-extrabold border transition-all flex items-center gap-1.5",
                          practiceTimer <= 10 && practiceTimer > 0
                            ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                            : practiceTimer === 0
                              ? "bg-gray-100 text-gray-400 border-gray-200"
                              : "bg-white text-gray-800 border-gray-200 shadow-2xs"
                        )}
                      >
                        <Timer className="h-3.5 w-3.5 text-gray-500" />
                        <span>{practiceTimer}s</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPracticeTimerRunning((p) => !p)}
                        className="rounded-lg p-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer shadow-2xs"
                        title={isPracticeTimerRunning ? "Mettre en pause" : "Lancer le chrono"}
                      >
                        {isPracticeTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-[#ff5722]" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPracticeTimerRunning(false);
                          setPracticeTimer(practiceTimerMax);
                        }}
                        className="rounded-lg p-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 cursor-pointer shadow-2xs"
                        title="Réinitialiser le chrono"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Content: Question Face or Answer Face */}
                  {!isCardFlipped ? (
                    /* RECTO: QUESTION */
                    <div className="py-8 space-y-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Question posée par le recruteur :
                      </p>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
                        « {currentPracticeItem.question} »
                      </h2>
                      <p className="text-xs text-gray-500 pt-2">
                        Prenez quelques secondes pour formuler votre réponse dans votre tête ou à voix haute. Quand vous êtes prêt, retournez la carte.
                      </p>
                    </div>
                  ) : (
                    /* VERSO: RÉPONSE & CONSEIL */
                    <div className="py-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Réponse Type & Points Clés :</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentPracticeItem.fullAnswer || "", currentPracticeItem.id)}
                          className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          {copiedId === currentPracticeItem.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>Copier la réponse</span>
                        </button>
                      </div>

                      {currentPracticeItem.fullAnswer && (
                        <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100 p-4 text-sm text-gray-900 leading-relaxed font-medium">
                          {currentPracticeItem.fullAnswer}
                        </div>
                      )}

                      {currentPracticeItem.situation && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <strong className="block text-gray-900 mb-0.5">S · Situation :</strong>
                            <span className="text-gray-700">{currentPracticeItem.situation}</span>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <strong className="block text-gray-900 mb-0.5">A · Action :</strong>
                            <span className="text-gray-700">{currentPracticeItem.action}</span>
                          </div>
                        </div>
                      )}

                      {currentPracticeItem.keyTip && (
                        <div className="rounded-xl bg-orange-50/70 border border-orange-200 p-3 text-xs text-orange-950 flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-[#ff5722] shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold">Conseil clé du recruteur : </strong>
                            <span>{currentPracticeItem.keyTip}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Bottom Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrevPracticeQuestion}
                        className="editorial-button-secondary h-9 px-3 text-xs flex items-center gap-1 font-semibold cursor-pointer"
                        title="Question précédente"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Précédente</span>
                      </button>

                      <span className="text-xs text-gray-400 font-medium px-2">
                        {(practiceIndex % filteredPracticePool.length) + 1} / {filteredPracticePool.length}
                      </span>

                      <button
                        type="button"
                        onClick={handleNextPracticeQuestion}
                        className="editorial-button-secondary h-9 px-3 text-xs flex items-center gap-1 font-semibold cursor-pointer"
                        title="Question suivante"
                      >
                        <span>Suivante</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Central Action: FLIP BUTTON */}
                    <button
                      type="button"
                      onClick={() => setIsCardFlipped((f) => !f)}
                      className={cn(
                        "h-10 px-5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer",
                        !isCardFlipped
                          ? "bg-[#ff5722] text-white hover:bg-[#e64a19]"
                          : "bg-gray-900 text-white hover:bg-black"
                      )}
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{isCardFlipped ? "Revoir la Question" : "Retourner la Carte (Voir la Réponse)"}</span>
                    </button>

                    {/* Self-Rating buttons when flipped */}
                    {isCardFlipped ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleScorePractice("mastered")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1.5"
                          title="Je sais y répondre sans hésiter"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Maîtrisé</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScorePractice("review")}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition cursor-pointer flex items-center gap-1.5"
                          title="À approfondir"
                        >
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Moyen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScorePractice("difficult")}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-800 border border-red-200 text-xs font-bold hover:bg-red-100 transition cursor-pointer flex items-center gap-1.5"
                          title="Difficile pour moi"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-red-600" />
                          <span>À revoir</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-[11px] text-gray-400">
                          {prepData.practiceScores?.[currentPracticeItem.id] === "mastered" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <Check className="h-3 w-3" />
                              <span>Déjà marquée comme maîtrisée</span>
                            </span>
                          ) : (
                            "Non évaluée"
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-3">Aucune question trouvée dans ce domaine.</p>
                <button
                  type="button"
                  onClick={() => setSelectedDomainFilter("all")}
                  className="editorial-button-secondary h-8 px-3 text-xs"
                >
                  Voir tous les domaines
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STUDIO DE PROMPT IA & IMPORT RAPIDE (LA MÉTHODE INTELLIGENTE)      */}
        {/* ========================================================================= */}
        {activeTab === "prompt_studio" && (
          <div className="space-y-5">
            {/* Explanatory Workflow Banner */}
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-[#fff3ef] to-white p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-[#ff5722]" />
                <h3 className="text-sm font-bold text-gray-900">
                  Comment ça marche ? Générez 20 questions sur-mesure en 30 secondes
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white border border-orange-100">
                  <strong className="text-gray-900 block mb-1">1. Choisissez vos critères</strong>
                  <span className="text-gray-500">Précisez le domaine (Python, SQL, ML, etc.), la langue et le niveau.</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-orange-100">
                  <strong className="text-gray-900 block mb-1">2. Copiez le Prompt IA</strong>
                  <span className="text-gray-500">Collez-le dans ChatGPT, Claude ou Gemini. Il génère les questions formatées.</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-orange-100">
                  <strong className="text-gray-900 block mb-1">3. Collez la réponse ici</strong>
                  <span className="text-gray-500">L&apos;application extrait les questions et les ajoute immédiatement à vos Flashcards !</span>
                </div>
              </div>
            </div>

            {/* Prompt Configurator */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5 shadow-xs">
              <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                Configuration du Prompt
              </h4>

              {/* Presets rapides de domaines */}
              <div className="space-y-2">
                <label className="editorial-label text-xs font-semibold text-gray-700">
                  Domaine technique cible
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {PROMPT_DOMAIN_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setPromptDomain(preset.name)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5",
                        promptDomain === preset.name
                          ? "bg-[#ff5722] text-white border-[#ff5722] shadow-2xs font-bold"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      {renderDomainPresetIcon(preset.iconType)}
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <input
                    type="text"
                    value={promptDomain}
                    onChange={(e) => setPromptDomain(e.target.value)}
                    placeholder="Ou saisissez un domaine personnalisé (ex: PySpark & Databricks, LangChain, etc.)"
                    className="editorial-input text-xs w-full font-medium"
                  />
                </div>
              </div>

              {/* Paramètres additionnels */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="editorial-label text-xs">Langue</label>
                  <select
                    value={promptLanguage}
                    onChange={(e) => setPromptLanguage(e.target.value as "fr" | "en")}
                    className="editorial-input text-xs w-full font-semibold cursor-pointer"
                  >
                    <option value="fr">🇫🇷 Français</option>
                    <option value="en">🇬🇧 Anglais</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="editorial-label text-xs">Nombre de questions</label>
                  <select
                    value={promptCount}
                    onChange={(e) => setPromptCount(Number(e.target.value))}
                    className="editorial-input text-xs w-full font-semibold cursor-pointer"
                  >
                    <option value={10}>10 questions</option>
                    <option value={15}>15 questions</option>
                    <option value={20}>20 questions</option>
                    <option value={30}>30 questions</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="editorial-label text-xs">Niveau</label>
                  <select
                    value={promptSeniority}
                    onChange={(e) => setPromptSeniority(e.target.value as any)}
                    className="editorial-input text-xs w-full font-semibold cursor-pointer"
                  >
                    <option value="internship_pfe">Stage PFE / Fin d&apos;études</option>
                    <option value="junior">Junior (0-2 ans)</option>
                    <option value="mid">Intermédiaire</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="editorial-label text-xs">Focus</label>
                  <select
                    value={promptFocus}
                    onChange={(e) => setPromptFocus(e.target.value as any)}
                    className="editorial-input text-xs w-full font-semibold cursor-pointer"
                  >
                    <option value="all">Équilibré (Général)</option>
                    <option value="technical">100% Technique / Code</option>
                    <option value="difficult">Questions Pièges & Délicates</option>
                    <option value="behavioral">Comportemental / RH</option>
                  </select>
                </div>
              </div>

              {/* The Generated Prompt Display */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="editorial-label text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Code2 className="h-4 w-4 text-[#ff5722]" />
                    <span>Prompt généré prêt pour ChatGPT / Claude</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedPrompt, "generated-prompt")}
                    className="editorial-button-primary h-8 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copier le Prompt IA (1-Clic)</span>
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-gray-900 text-gray-100 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-48 border border-gray-800">
                  {generatedPrompt}
                </pre>
              </div>

              {/* Paste & Import Box */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <UploadCloud className="h-4 w-4 text-[#ff5722]" />
                      <span>Collez la réponse de l&apos;IA ci-dessous</span>
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Collez le texte brut ou le JSON retourné par ChatGPT ou Claude.
                    </p>
                  </div>

                  {parsedQuestionsPreview.length > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                      <span>{parsedQuestionsPreview.length} questions prêtes à être importées</span>
                    </span>
                  )}
                </div>

                <textarea
                  className="editorial-textarea min-h-[140px] w-full text-xs font-mono leading-relaxed p-3.5 bg-gray-50/50"
                  placeholder="Collez ici la réponse de l'IA (le tableau JSON ou la liste de questions/réponses)..."
                  value={pastedAIResponse}
                  onChange={(e) => setPastedAIResponse(e.target.value)}
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  {pastedAIResponse && (
                    <button
                      type="button"
                      onClick={() => setPastedAIResponse("")}
                      className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
                    >
                      Effacer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleImportParsedQuestions}
                    disabled={parsedQuestionsPreview.length === 0}
                    className="editorial-button-primary h-10 px-5 text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    <span>
                      Importer {parsedQuestionsPreview.length > 0 ? `${parsedQuestionsPreview.length} questions` : "les questions"} dans mes Flashcards
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BLOC-NOTES FORUM ENTREPRISES & PROFILS RECHERCHÉS                 */}
        {/* ========================================================================= */}
        {activeTab === "forum_notes" && (
          <ForumCompanyNotebook />
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FICHE ENTREPRISE LINKÉE À SUPABASE                                 */}
        {/* ========================================================================= */}
        {activeTab === "company" && (
          <div className="space-y-4">
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

            {activeCompany && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5 shadow-xs">
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

                {/* Points forts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span>Points forts & actualités de l&apos;entreprise à citer</span>
                    </h4>
                    <span className="text-[11px] text-gray-400">Pour flatter l&apos;équipe</span>
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
                          {copiedId === `pt-${i}` ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Questions adaptées */}
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
                          {copiedId === `co-q-${i}` ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
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

        {/* ========================================================================= */}
        {/* TAB 4: QUESTIONS STRATÉGIQUES (EFFET WOW)                                 */}
        {/* ========================================================================= */}
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
                          <span className="rounded-md bg-orange-100/80 px-2 py-0.5 text-[10.5px] font-bold text-[#ff5722] uppercase tracking-wide inline-flex items-center gap-1.5">
                            {item.category === "architecture" ? (
                              <>
                                <Layers className="h-3 w-3" />
                                <span>Architecture & Tech</span>
                              </>
                            ) : item.category === "success_metrics" ? (
                              <>
                                <Target className="h-3 w-3" />
                                <span>Critères de Succès</span>
                              </>
                            ) : item.category === "team_culture" ? (
                              <>
                                <Briefcase className="h-3 w-3" />
                                <span>Organisation & Équipe</span>
                              </>
                            ) : (
                              <>
                                <TrendingUp className="h-3 w-3" />
                                <span>Vision & Business</span>
                              </>
                            )}
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
                        {copiedId === item.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MON PITCH 2 MINUTES                                               */}
        {/* ========================================================================= */}
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

        {/* ========================================================================= */}
        {/* TAB 6: BANQUE COMPLÈTE DE QUESTIONS (AVEC SUPPRESSION & GESTION)         */}
        {/* ========================================================================= */}
        {activeTab === "qa" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher parmi toutes les questions enregistrées..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="editorial-input !pl-9 text-xs w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("prompt_studio")}
                  className="editorial-button-primary h-9 px-3.5 text-xs flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Importer d&apos;autres questions (IA)</span>
                </button>
              </div>
            </div>

            <div className="grid gap-3.5">
              {prepData.qaList
                .filter((q) => !searchQuery || q.question.toLowerCase().includes(searchQuery.toLowerCase()) || (q.domain && q.domain.toLowerCase().includes(searchQuery.toLowerCase())))
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.domain && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-[#ff5722]">
                              {item.domain}
                            </span>
                          )}
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase">
                            {item.category}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 mt-1">
                          {item.question}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const content = item.fullAnswer || `S: ${item.situation}\nT: ${item.task}\nA: ${item.action}\nR: ${item.result}`;
                            copyToClipboard(content, item.id);
                          }}
                          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-[#ff5722] cursor-pointer"
                        >
                          {copiedId === item.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQAItem(item.id)}
                          className="rounded-lg p-2 text-gray-400 hover:text-red-500 cursor-pointer"
                          title="Supprimer cette question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {item.fullAnswer && (
                      <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-800 leading-relaxed font-medium">
                        {item.fullAnswer}
                      </div>
                    )}

                    {item.keyTip && (
                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-[#ff5722] shrink-0" />
                        <span>{item.keyTip}</span>
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL CRÉATION FICHE ENTREPRISE LINKÉE À SUPABASE                         */}
      {/* ========================================================================= */}
      {isCreateCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsCreateCompanyModalOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
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
                className="rounded-lg p-2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-gray-400" />
                  <span>Entreprise dans votre base (Tracker)</span>
                </label>
                <select
                  value={modalSelectedDbCompanyId}
                  onChange={(e) => handleModalCompanySelect(e.target.value)}
                  className="editorial-input text-xs w-full font-medium bg-white"
                >
                  {dbCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.sector ? `(${c.sector})` : ""}
                    </option>
                  ))}
                  <option value="custom">Autre entreprise (Saisie manuelle libre)...</option>
                </select>
              </div>

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

function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
