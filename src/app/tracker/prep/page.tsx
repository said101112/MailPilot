"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Flame,
  HelpCircle,
  Lightbulb,
  Mic,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Star,
  Target,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PREP_DATA,
  loadInterviewPrep,
  saveInterviewPrep,
  type CompanyPrepItem,
  type InterviewPrepState,
  type PitchData,
  type QuestionAnswerItem,
  type StrategicQuestionItem,
} from "@/lib/tracker/interviewPrep";

export default function InterviewPrepPage() {
  const [prepData, setPrepData] = useState<InterviewPrepState>(DEFAULT_PREP_DATA);
  const [activeTab, setActiveTab] = useState<"strategic" | "pitch" | "qa" | "company">("strategic");
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pitch Timer state (2 minutes practice)
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Editing state for company sheets
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("cs-demo");
  const [isAddingQuestionModal, setIsAddingQuestionModal] = useState(false);
  const [newQuestionCategory, setNewQuestionCategory] = useState<StrategicQuestionItem["category"]>("architecture");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionImpact, setNewQuestionImpact] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadInterviewPrep();
    setPrepData(loaded);
    if (loaded.companySheets.length > 0) {
      setSelectedCompanyId(loaded.companySheets[0].id);
    }
  }, []);

  // Save changes
  const updateState = (updater: (prev: InterviewPrepState) => InterviewPrepState) => {
    setPrepData((prev) => {
      const next = updater(prev);
      saveInterviewPrep(next);
      return next;
    });
  };

  // Timer logic for 2-minute pitch practice
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

  const toggleTimer = () => setIsTimerRunning((prev) => !prev);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(120);
  };

  const copyToClipboard = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copié dans le presse-papier !");
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Filtered strategic questions
  const filteredStrategicQuestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return prepData.strategicQuestions;
    return prepData.strategicQuestions.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.impactReason.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [prepData.strategicQuestions, searchQuery]);

  // Filtered Q&A
  const filteredQA = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return prepData.qaList;
    return prepData.qaList.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        (item.fullAnswer && item.fullAnswer.toLowerCase().includes(q)) ||
        (item.action && item.action.toLowerCase().includes(q)) ||
        (item.keyTip && item.keyTip.toLowerCase().includes(q))
    );
  }, [prepData.qaList, searchQuery]);

  const activeCompany = useMemo(() => {
    return (
      prepData.companySheets.find((c) => c.id === selectedCompanyId) ||
      prepData.companySheets[0] ||
      null
    );
  }, [prepData.companySheets, selectedCompanyId]);

  // Handlers
  const handleAddStrategicQuestion = () => {
    if (!newQuestionText.trim()) {
      toast.error("Veuillez renseigner le texte de la question.");
      return;
    }
    const newQ: StrategicQuestionItem = {
      id: `sq-${Date.now()}`,
      category: newQuestionCategory,
      question: newQuestionText.trim(),
      impactReason: newQuestionImpact.trim() || "Question percutante pour révéler l'organisation de l'équipe.",
      tags: [newQuestionCategory],
    };
    updateState((prev) => ({
      ...prev,
      strategicQuestions: [newQ, ...prev.strategicQuestions],
    }));
    setNewQuestionText("");
    setNewQuestionImpact("");
    setIsAddingQuestionModal(false);
    toast.success("Question stratégique ajoutée !");
  };

  const handleDeleteStrategicQuestion = (id: string) => {
    updateState((prev) => ({
      ...prev,
      strategicQuestions: prev.strategicQuestions.filter((q) => q.id !== id),
    }));
    toast.info("Question supprimée.");
  };

  const handleUpdatePitchField = (field: keyof PitchData, value: string) => {
    updateState((prev) => ({
      ...prev,
      pitch: {
        ...prev.pitch,
        [field]: value,
      },
    }));
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

  const handleCreateNewCompanySheet = () => {
    const name = window.prompt("Nom de l'entreprise cible (ex: Thales, Doctolib) :");
    if (!name || !name.trim()) return;
    const newSheet: CompanyPrepItem = {
      id: `cs-${Date.now()}`,
      companyName: name.trim(),
      roleTitle: "Stage PFE - Ingénieur Data / Tech",
      strongPoints: [
        "Leur stack technologique innovante",
        "La dynamique de croissance de l'équipe",
      ],
      keyChallenges: "Scalabilité et traitement de flux de données.",
      tailoredQuestions: [
        `Comment votre équipe chez ${name.trim()} aborde-t-elle l'industrialisation des projets ?`,
      ],
      liveNotes: "",
      updatedAt: new Date().toISOString(),
    };
    updateState((prev) => ({
      ...prev,
      companySheets: [newSheet, ...prev.companySheets],
    }));
    setSelectedCompanyId(newSheet.id);
    toast.success(`Fiche préparatoire créée pour ${name.trim()} !`);
  };

  return (
    <div className={cn("page-shell min-h-screen", isReadingMode && "bg-[#faf9f6]")}>
      <div className="mx-auto max-w-[960px] space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-[#ff5722] text-sm">
                🧠
              </span>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Aide-Mémoire & Questions Stratégiques
              </h1>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Votre hub de révision avant entretien : pitch en 2 minutes, méthode STAR et questions « effet WOW » à poser aux recruteurs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Reading Mode Toggle (Great on mobile/transit) */}
            <button
              type="button"
              onClick={() => {
                setIsReadingMode((prev) => !prev);
                toast.info(
                  !isReadingMode
                    ? "📱 Mode Révision activé (Lecture confortable optimisée mobile)"
                    : "Mode Standard rétabli"
                );
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition border cursor-pointer",
                isReadingMode
                  ? "bg-[#ff5722] text-white border-[#ff5722] shadow-xs"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
              title="Active un affichage aéré et épuré pour réviser dans les transports ou juste avant l'appel"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{isReadingMode ? "Mode Révision Activé" : "Mode En Route (Lecture)"}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-1">
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
            <span>Questions Stratégiques à Poser</span>
            <span className="rounded-full bg-orange-200/70 px-1.5 py-0.2 text-[10px] text-orange-900 font-bold">
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
            <span>Questions Pièges & Méthode STAR</span>
            <span className="rounded-full bg-gray-200 px-1.5 py-0.2 text-[10px] text-gray-700 font-bold">
              {prepData.qaList.length}
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
            <span>Fiche Entreprise & Bloc-Notes</span>
          </button>
        </div>

        {/* TAB 1: QUESTIONS STRATÉGIQUES À POSER AU RECRUTEUR */}
        {activeTab === "strategic" && (
          <div className="space-y-4">
            {/* Top Toolbar */}
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

            {/* Explanatory banner */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
              <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">
                  Le secret des 1% : posez des questions de diagnostic technique
                </p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  Lorsque le recruteur ou manager technique demande <em>« Avez-vous des questions pour nous ? »</em>, ne dites jamais <em>« Non c&apos;est bon »</em>. Utilisez ces questions chirurgicales pour démontrer votre maturité professionnelle.
                </p>
              </div>
            </div>

            {/* List of Strategic Questions */}
            <div className="grid gap-3.5 sm:grid-cols-1">
              {filteredStrategicQuestions.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border border-gray-200 bg-white p-4 sm:p-5 transition shadow-2xs hover:border-orange-200",
                    isReadingMode && "p-6 border-amber-200/70"
                  )}
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

                      <p
                        className={cn(
                          "font-semibold text-gray-900 text-sm leading-relaxed",
                          isReadingMode && "text-base font-bold text-gray-950"
                        )}
                      >
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

                    <div className="flex items-center gap-1.5 shrink-0">
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
                      <button
                        type="button"
                        onClick={() => handleDeleteStrategicQuestion(item.id)}
                        className="rounded-lg p-2 text-gray-400 hover:text-red-500 transition cursor-pointer"
                        title="Supprimer cette question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PITCH EN 2 MINUTES CHRONO */}
        {activeTab === "pitch" && (
          <div className="space-y-5">
            {/* Chronometer Toolbar */}
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
                  onClick={toggleTimer}
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
                  onClick={resetTimer}
                  className="editorial-button-secondary h-10 px-3 text-xs flex items-center gap-1 text-gray-600 hover:text-gray-900 cursor-pointer"
                  title="Réinitialiser à 2:00"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Pitch Interactive Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>🎙️ Structure Recommandée du Pitch</span>
                </h4>
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

              {/* 1. L'Accroche */}
              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[#ff5722] text-[10px] font-bold">1</span>
                  <span>1. L&apos;Accroche (15 secondes - Qui je suis)</span>
                </label>
                <textarea
                  className="editorial-textarea min-h-[70px] w-full text-xs font-medium leading-relaxed"
                  value={prepData.pitch.hook}
                  onChange={(e) => handleUpdatePitchField("hook", e.target.value)}
                />
              </div>

              {/* 2. Le Parcours & Compétences */}
              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[#ff5722] text-[10px] font-bold">2</span>
                  <span>2. Le Socle Technique (30 secondes - Mes piliers d&apos;expertise)</span>
                </label>
                <textarea
                  className="editorial-textarea min-h-[70px] w-full text-xs font-medium leading-relaxed"
                  value={prepData.pitch.background}
                  onChange={(e) => handleUpdatePitchField("background", e.target.value)}
                />
              </div>

              {/* 3. Le Projet Phare */}
              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[#ff5722] text-[10px] font-bold">3</span>
                  <span>3. Le Projet Phare (45 secondes - Preuve concrète de résultat)</span>
                </label>
                <textarea
                  className="editorial-textarea min-h-[85px] w-full text-xs font-medium leading-relaxed"
                  value={prepData.pitch.keyProjects}
                  onChange={(e) => handleUpdatePitchField("keyProjects", e.target.value)}
                />
              </div>

              {/* 4. Pourquoi cette entreprise */}
              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[#ff5722] text-[10px] font-bold">4</span>
                  <span>4. Pourquoi vous et ce poste (20 secondes - L&apos;alignement)</span>
                </label>
                <textarea
                  className="editorial-textarea min-h-[70px] w-full text-xs font-medium leading-relaxed"
                  value={prepData.pitch.whyThisCompany}
                  onChange={(e) => handleUpdatePitchField("whyThisCompany", e.target.value)}
                />
              </div>

              {/* 5. Conclusion */}
              <div className="space-y-1.5">
                <label className="editorial-label text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[#ff5722] text-[10px] font-bold">5</span>
                  <span>5. Conclusion & Transition vers l&apos;échange (10 secondes)</span>
                </label>
                <textarea
                  className="editorial-textarea min-h-[60px] w-full text-xs font-medium leading-relaxed"
                  value={prepData.pitch.conclusion}
                  onChange={(e) => handleUpdatePitchField("conclusion", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: QUESTIONS PIÈGES & MÉTHODE STAR */}
        {activeTab === "qa" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-950 flex items-start gap-2.5">
              <Target className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-950">
                  La Méthode STAR : Situation · Tâche · Action · Résultat
                </p>
                <p className="mt-0.5 text-blue-800 leading-relaxed">
                  C&apos;est le standard d&apos;évaluation des recruteurs tech (Google, Amazon, banques et licornes). Quand on vous demande un exemple de projet ou de défi, déroulez ces 4 étapes.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredQA.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 space-y-3.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase">
                        {item.category === "classic"
                          ? "Classique"
                          : item.category === "technical"
                            ? "Technique"
                            : item.category === "behavioral"
                              ? "Comportemental"
                              : "Question Piège"}
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 leading-snug">
                        {item.question}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const content = item.fullAnswer || `S: ${item.situation}\nT: ${item.task}\nA: ${item.action}\nR: ${item.result}`;
                        copyToClipboard(content, item.id);
                      }}
                      className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-[#ff5722] hover:border-orange-200 transition cursor-pointer shrink-0"
                      title="Copier la réponse"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {item.fullAnswer && (
                    <div className="rounded-lg bg-gray-50/80 p-3 text-xs text-gray-800 leading-relaxed font-medium">
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
                        <strong className="text-emerald-950 block mb-0.5">A · Action (Ce que j&apos;ai fait)</strong>
                        <span className="text-emerald-900">{item.action}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-100">
                        <strong className="text-purple-950 block mb-0.5">R · Résultat (Chiffres concrets)</strong>
                        <span className="text-purple-900">{item.result}</span>
                      </div>
                    </div>
                  )}

                  {item.keyTip && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-1">
                      <Lightbulb className="h-3.5 w-3.5 text-[#ff5722] shrink-0" />
                      <span>{item.keyTip}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: FICHE ENTREPRISE & BLOC-NOTES LIVE */}
        {activeTab === "company" && (
          <div className="space-y-4">
            {/* Company Selector & New button */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="editorial-input text-xs font-semibold w-full cursor-pointer"
                >
                  {prepData.companySheets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.roleTitle})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleCreateNewCompanySheet}
                className="editorial-button-secondary h-9 px-3.5 text-xs flex items-center gap-1.5 cursor-pointer font-semibold"
              >
                <Plus className="h-3.5 w-3.5 text-[#ff5722]" />
                <span>Nouvelle fiche entreprise</span>
              </button>
            </div>

            {activeCompany && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {activeCompany.companyName}
                    </h3>
                    <p className="text-xs text-gray-500">{activeCompany.roleTitle}</p>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Modifié le {new Date(activeCompany.updatedAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                {/* Points forts */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>Points forts de l&apos;entreprise à citer</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-gray-700 list-disc list-inside bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                    {activeCompany.strongPoints.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>

                {/* Questions adaptées */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-[#ff5722]" />
                    <span>Questions personnalisées à leur poser</span>
                  </h4>
                  <div className="space-y-1.5">
                    {activeCompany.tailoredQuestions.map((q, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50/50 border border-orange-100 text-xs text-gray-800"
                      >
                        <span>« {q} »</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(q, `co-q-${i}`)}
                          className="text-gray-400 hover:text-[#ff5722] cursor-pointer"
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

                {/* Live Notes during phone interview */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Edit3 className="h-3.5 w-3.5 text-gray-500" />
                      <span>Bloc-Notes en direct (pendant ou après l&apos;appel)</span>
                    </h4>
                    <span className="text-[11px] text-gray-400">Sauvegarde automatique</span>
                  </div>
                  <textarea
                    className="editorial-textarea min-h-[140px] w-full text-xs font-medium leading-relaxed p-3.5"
                    placeholder="Notez ici les retours du recruteur, questions techniques posées, date convenue pour le prochain entretien, noms des interlocuteurs..."
                    value={activeCompany.liveNotes}
                    onChange={(e) => handleUpdateCompanyNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Ajouter une Question Stratégique Personnalisée */}
      {isAddingQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsAddingQuestionModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              Ajouter une Question Stratégique
            </h3>

            <div className="space-y-1.5">
              <label className="editorial-label text-xs font-semibold text-gray-700">
                Catégorie
              </label>
              <select
                value={newQuestionCategory}
                onChange={(e) =>
                  setNewQuestionCategory(
                    e.target.value as StrategicQuestionItem["category"]
                  )
                }
                className="editorial-input text-xs w-full font-medium"
              >
                <option value="architecture">🛠️ Architecture & Tech</option>
                <option value="success_metrics">🎯 Critères de Succès</option>
                <option value="team_culture">🤝 Organisation & Équipe</option>
                <option value="business_vision">🚀 Vision & Business</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="editorial-label text-xs font-semibold text-gray-700">
                Votre question *
              </label>
              <textarea
                className="editorial-textarea min-h-[90px] w-full text-xs font-medium"
                placeholder="Ex : Quel est votre plus grand défi de mise en production actuel ?"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="editorial-label text-xs font-semibold text-gray-700">
                Pourquoi cette question est percutante
              </label>
              <input
                type="text"
                className="editorial-input text-xs w-full font-medium"
                placeholder="Ex : Montre que j'anticipe les contraintes réelles de livraison."
                value={newQuestionImpact}
                onChange={(e) => setNewQuestionImpact(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsAddingQuestionModal(false)}
                className="editorial-button-secondary h-9 px-3.5 text-xs cursor-pointer font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddStrategicQuestion}
                className="editorial-button-primary h-9 px-4 text-xs cursor-pointer font-bold"
              >
                Enregistrer la question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
