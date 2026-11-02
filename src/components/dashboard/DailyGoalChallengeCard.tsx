"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Flame,
  Target,
  Trophy,
  Zap,
  Globe,
  Mail,
  Search,
  Plus,
  CheckCircle2,
  TrendingUp,
  Settings2,
  X,
  Sparkles,
  Calendar,
  Check,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface ActivityItem {
  id: string;
  company: string | null;
  position: string | null;
  email: string;
  status: string;
  created_at: string;
}

interface DailyGoalChallengeCardProps {
  applicationsTodayCount?: number;
  allApplications?: ActivityItem[];
  onActivityLogged?: () => void;
}

interface WeekDayItem {
  dateStr: string;
  dayShort: string;
  dayFull: string;
  dayNum: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  count: number;
  isCompleted: boolean;
}

const STORAGE_KEY_GOAL = "mailpilot_daily_goal_target";
const STORAGE_KEY_STREAK = "mailpilot_daily_streak_data";
const STORAGE_KEY_OFFLINE_LOGS = "mailpilot_daily_offline_logs";

export default function DailyGoalChallengeCard({
  applicationsTodayCount = 0,
  allApplications = [],
  onActivityLogged,
}: DailyGoalChallengeCardProps) {
  // 1. Quota paramétrable (Par défaut 20 candidatures / jour = calibré pour le marché PFE Maroc)
  const [dailyGoal, setDailyGoal] = useState<number>(20);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Activités locales du jour (plateformes externes + leads sourcés)
  const [platformCountToday, setPlatformCountToday] = useState(0);
  const [leadsCountToday, setLeadsCountToday] = useState(0);
  const [streakDays, setStreakDays] = useState(1);

  // Formulaire pour logger une candidature plateforme externe
  const [platformCompany, setPlatformCompany] = useState("");
  const [platformPosition, setPlatformPosition] = useState("Stage PFE - Génie Logiciel & IA");
  const [platformChannel, setPlatformChannel] = useState("LinkedIn");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Charger les paramètres et l'état du streak
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Charger l'objectif
    const storedGoal = localStorage.getItem(STORAGE_KEY_GOAL);
    if (storedGoal) {
      const parsed = parseInt(storedGoal, 10);
      if (!isNaN(parsed) && parsed > 0) setDailyGoal(parsed);
    }

    // Charger les logs locaux du jour
    try {
      const rawLogs = localStorage.getItem(`${STORAGE_KEY_OFFLINE_LOGS}_${todayStr}`);
      if (rawLogs) {
        const parsed = JSON.parse(rawLogs);
        if (parsed.platforms) setPlatformCountToday(parsed.platforms);
        if (parsed.leads) setLeadsCountToday(parsed.leads);
      }
    } catch {
      // ignore
    }

    // Calcul du streak
    try {
      const rawStreak = localStorage.getItem(STORAGE_KEY_STREAK);
      if (rawStreak) {
        const { currentStreak, lastCompletedDate } = JSON.parse(rawStreak);
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        if (lastCompletedDate === todayStr || lastCompletedDate === yesterday) {
          setStreakDays(currentStreak || 1);
        } else {
          // Streak brisé si plus d'un jour d'inactivité
          setStreakDays(0);
        }
      }
    } catch {
      // ignore
    }
  }, [todayStr]);

  // Total d'actions aujourd'hui
  const totalCompletedToday = applicationsTodayCount + platformCountToday;
  const progressPercent = Math.min(100, Math.round((totalCompletedToday / dailyGoal) * 100));
  const remainingCount = Math.max(0, dailyGoal - totalCompletedToday);
  const isGoalReached = totalCompletedToday >= dailyGoal;

  // Mise à jour du streak quand l'objectif est franchi
  useEffect(() => {
    if (typeof window === "undefined" || !isGoalReached) return;

    try {
      const rawStreak = localStorage.getItem(STORAGE_KEY_STREAK);
      let currentStreak = 1;
      let lastCompletedDate = "";

      if (rawStreak) {
        const parsed = JSON.parse(rawStreak);
        currentStreak = parsed.currentStreak || 1;
        lastCompletedDate = parsed.lastCompletedDate || "";
      }

      if (lastCompletedDate !== todayStr) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const newStreak = lastCompletedDate === yesterday ? currentStreak + 1 : 1;
        localStorage.setItem(
          STORAGE_KEY_STREAK,
          JSON.stringify({
            currentStreak: newStreak,
            lastCompletedDate: todayStr,
          })
        );
        setStreakDays(newStreak);
      }
    } catch {
      // ignore
    }
  }, [isGoalReached, todayStr]);

  // 2. Calcul des 7 jours de la semaine courante (Style Duolingo)
  const weekDays = useMemo<WeekDayItem[]>(() => {
    const now = new Date();
    // En JS : 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi. On translate pour que Lundi = 0.
    const dayOfWeek = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);

    const shortLabels = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
    const fullLabels = [
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche",
    ];

    const result: WeekDayItem[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const isToday = i === dayOfWeek;
      const isPast = i < dayOfWeek;
      const isFuture = i > dayOfWeek;

      let count = 0;
      if (isToday) {
        count = applicationsTodayCount + platformCountToday;
      } else if (allApplications && allApplications.length > 0) {
        const dbCount = allApplications.filter(
          (app) => app.created_at && app.created_at.startsWith(dateStr)
        ).length;
        let offlineCount = 0;
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem(`${STORAGE_KEY_OFFLINE_LOGS}_${dateStr}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              offlineCount = parsed.platforms || 0;
            }
          } catch {
            // ignore
          }
        }
        count = dbCount + offlineCount;
      }

      const isCompleted = count >= dailyGoal;

      result.push({
        dateStr,
        dayShort: shortLabels[i],
        dayFull: fullLabels[i],
        dayNum: d.getDate(),
        isToday,
        isPast,
        isFuture,
        count,
        isCompleted,
      });
    }

    return result;
  }, [allApplications, applicationsTodayCount, platformCountToday, dailyGoal]);

  const completedDaysCount = useMemo(
    () => weekDays.filter((w) => w.isCompleted).length,
    [weekDays]
  );

  const saveDailyGoal = (goal: number) => {
    setDailyGoal(goal);
    localStorage.setItem(STORAGE_KEY_GOAL, goal.toString());
    setIsSettingsOpen(false);
  };

  const incrementLeads = () => {
    const nextLeads = leadsCountToday + 1;
    setLeadsCountToday(nextLeads);
    localStorage.setItem(
      `${STORAGE_KEY_OFFLINE_LOGS}_${todayStr}`,
      JSON.stringify({
        platforms: platformCountToday,
        leads: nextLeads,
      })
    );
  };

  const handleLogPlatformApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformCompany.trim()) return;

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("applications").insert([
        {
          user_id: user?.id,
          company: platformCompany.trim(),
          position: platformPosition.trim() || "Stage PFE / Candidature Plateforme",
          email: `${platformChannel.toLowerCase()}@application.direct`,
          status: "success",
        },
      ]);

      const nextPlatforms = platformCountToday + 1;
      setPlatformCountToday(nextPlatforms);
      localStorage.setItem(
        `${STORAGE_KEY_OFFLINE_LOGS}_${todayStr}`,
        JSON.stringify({
          platforms: nextPlatforms,
          leads: leadsCountToday,
        })
      );

      setPlatformCompany("");
      setIsLogModalOpen(false);
      if (onActivityLogged) onActivityLogged();
    } catch (err) {
      console.error("Erreur enregistrement candidature plateforme:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-8 rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/50 via-white to-amber-50/30 p-5 shadow-xs sm:p-6 transition-all">
      {/* 1. Header du Défi Quotidien */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5722] to-amber-500 text-white shadow-md shadow-orange-500/20">
            <Flame className="h-6 w-6 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-gray-900 sm:text-lg">
                Défi &amp; Agenda PFE 2027
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-0.5 text-xs font-black text-white shadow-xs">
                <Flame className="h-3.5 w-3.5 fill-white" />
                {streakDays > 0 ? `${streakDays} j de suite` : "Jour 1"}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Marché Maroc &amp; PFE : <strong className="text-gray-700">15 à 20 candidatures / jour</strong> ={" "}
              <span className="text-[#ff5722] font-semibold">2 à 3 entretiens par semaine</span>.
            </p>
          </div>
        </div>

        {/* Bouton de configuration du Quota */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="editorial-button-secondary h-8 px-2.5 text-xs inline-flex items-center gap-1.5"
            title="Ajuster l'objectif quotidien"
          >
            <Settings2 className="h-3.5 w-3.5 text-gray-500" />
            <span>Objectif : {dailyGoal}/j</span>
          </button>
        </div>
      </div>

      {/* Popover Réglage de l'Objectif */}
      {isSettingsOpen && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-md animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
            <span className="text-xs font-bold text-gray-900">
              Calibrage Maroc &amp; PFE (ENSA / Ingénieur) :
            </span>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                goal: 10,
                title: "Cadence Modérée 🇲🇦",
                desc: "10/jour • ~50/sem (1 entretien)",
              },
              {
                goal: 20,
                title: "Recommandé Maroc 🎯",
                desc: "20/jour • ~100/sem (2-3 entretiens)",
                highlight: true,
              },
              {
                goal: 30,
                title: "Challenger ESN 🔥",
                desc: "30/jour • ~150/sem (Offres rapides)",
              },
              {
                goal: 50,
                title: "Blitz Batch Send ⚡",
                desc: "50/jour • Campagne massive Nearshore",
              },
            ].map((option) => (
              <button
                key={option.goal}
                onClick={() => saveDailyGoal(option.goal)}
                className={`flex flex-col text-left p-2.5 rounded-lg border transition-all text-xs ${
                  dailyGoal === option.goal
                    ? "border-[#ff5722] bg-orange-50/70 font-semibold text-[#ff5722]"
                    : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                }`}
              >
                <span className="font-bold">{option.title}</span>
                <span className="text-[11px] text-gray-500 mt-0.5">{option.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. AGENDA DE LA SEMAINE (STYLE DUOLINGO STREAK) */}
      <div className="mt-5 rounded-2xl border border-orange-200/70 bg-white/90 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#ff5722]" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-700">
              Agenda de la Semaine
            </span>
          </div>
          <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold text-[#ff5722] border border-orange-200/50">
            {completedDaysCount}/7 jours validés
          </span>
        </div>

        {/* 7 Jours de la semaine (LUN à DIM) */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 text-center">
          {weekDays.map((day) => {
            return (
              <div
                key={day.dateStr}
                className={`flex flex-col items-center justify-between rounded-xl py-2 px-1 transition-all ${
                  day.isToday
                    ? "bg-orange-50/80 ring-2 ring-[#ff5722]/60 shadow-xs"
                    : "hover:bg-gray-50"
                }`}
              >
                {/* Nom du jour */}
                <span
                  className={`text-[10px] sm:text-xs font-black tracking-wider ${
                    day.isToday ? "text-[#ff5722]" : "text-gray-400"
                  }`}
                >
                  {day.dayShort}
                </span>

                {/* Badge circulaire Duolingo */}
                <div className="my-1.5 flex items-center justify-center">
                  {day.isCompleted ? (
                    // Validé avec Flamme Duolingo
                    <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#ff5722] to-amber-500 text-white shadow-sm shadow-orange-500/30 ring-2 ring-orange-200 animate-in zoom-in-75">
                      <Flame className="h-4 w-4 sm:h-5 sm:w-5 fill-white" />
                    </div>
                  ) : day.isToday ? (
                    // Aujourd'hui en cours
                    <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 border-dashed border-[#ff5722] bg-orange-50/50 text-[#ff5722]">
                      <span className="text-[10px] sm:text-xs font-black">
                        {day.count}
                      </span>
                      {day.count > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5722] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff5722]"></span>
                        </span>
                      )}
                    </div>
                  ) : day.isPast ? (
                    // Passé non complété
                    <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-gray-100 text-gray-300">
                      <span className="text-xs font-bold text-gray-400">•</span>
                    </div>
                  ) : (
                    // Futur
                    <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-gray-200 text-gray-400">
                      <span className="text-[10px] sm:text-xs font-medium">
                        {day.dayNum}
                      </span>
                    </div>
                  )}
                </div>

                {/* Label Date ou "Aujourd'hui" */}
                {day.isToday ? (
                  <span className="rounded-full bg-[#ff5722] px-1.5 py-0.2 text-[9px] font-black text-white">
                    Auj.
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-gray-400">
                    {day.dayNum}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Message de Mission Duolingo pour aujourd'hui */}
        <div className="mt-3.5 flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-100/70 via-amber-50 to-orange-50 px-3.5 py-2.5 border border-orange-200/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {isGoalReached ? "🎉" : totalCompletedToday > 0 ? "⚡" : "🎯"}
            </span>
            <div className="text-xs">
              {isGoalReached ? (
                <p className="font-bold text-gray-900">
                  Mission d&apos;aujourd&apos;hui validée !{" "}
                  <span className="text-emerald-700 font-extrabold">
                    ({totalCompletedToday}/{dailyGoal})
                  </span>{" "}
                  – Ta flamme est allumée ! 🔥
                </p>
              ) : (
                <p className="font-semibold text-gray-800">
                  Mission du jour :{" "}
                  <strong className="text-[#ff5722]">
                    {totalCompletedToday} / {dailyGoal}
                  </strong>{" "}
                  candidatures faites •{" "}
                  <span className="text-gray-600">
                    Encore {remainingCount} pour valider ta journée !
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="hidden sm:block">
            {isGoalReached ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
                COMPLÉTÉ
              </span>
            ) : (
              <span className="text-[11px] font-bold text-[#ff5722]">
                {progressPercent}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Jauge de Progression de la Journée */}
      <div className="mt-4">
        <div className="flex items-end justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-500">
            Avancement aujourd&apos;hui
          </span>
          <span className="text-xs font-bold text-gray-700">
            {totalCompletedToday} sur {dailyGoal} requis ({progressPercent}%)
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200/80 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isGoalReached
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : progressPercent >= 60
                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : "bg-[#ff5722]"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 4. Répartition des Actions Réalisées Aujourd'hui */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {/* Actions Emails direct MailPilot */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-white/80 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-[#ff5722]">
              <Mail className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500">Emails Directs (MailPilot)</p>
              <p className="text-sm font-bold text-gray-900">{applicationsTodayCount} envoyés</p>
            </div>
          </div>
          <Link
            href="/apply"
            className="text-[11px] font-bold text-[#ff5722] hover:underline"
          >
            Postuler &rarr;
          </Link>
        </div>

        {/* Actions Plateformes (LinkedIn, Welcome to the Jungle, Career) */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-white/80 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Globe className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500">Plateformes (LinkedIn / RH)</p>
              <p className="text-sm font-bold text-gray-900">{platformCountToday} loggées</p>
            </div>
          </div>
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
          >
            <Plus className="h-3 w-3" />
            Ajouter
          </button>
        </div>

        {/* Leads & Contacts identifiés */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-white/80 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Search className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500">Emails RH / Leads Sourcés</p>
              <p className="text-sm font-bold text-gray-900">{leadsCountToday} trouvés</p>
            </div>
          </div>
          <button
            onClick={incrementLeads}
            className="text-[11px] font-bold text-purple-600 hover:underline inline-flex items-center gap-0.5"
            title="Incrémenter les contacts trouvés"
          >
            <Plus className="h-3 w-3" />
            +1 Lead
          </button>
        </div>
      </div>

      {/* 5. Barre d'action rapide en bas */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-orange-100 text-xs">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>
            Astuce Maroc : <strong>15 emails ciblés + 5 candidatures LinkedIn par jour</strong> = 100 opportunités/semaine (2 à 4 entretiens garantis).
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="editorial-button-secondary h-7 px-3 text-[11px] inline-flex items-center gap-1"
          >
            <Globe className="h-3 w-3 text-blue-600" />
            <span>+1 Candidature Plateforme</span>
          </button>
          <Link
            href="/apply"
            className="editorial-button-primary h-7 px-3 text-[11px] inline-flex items-center gap-1"
          >
            <Zap className="h-3 w-3" />
            <span>Envoyer un Email</span>
          </Link>
        </div>
      </div>

      {/* MODAL RAPIDE : Logger une candidature externe (LinkedIn, WTTJ, etc.) */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Logger une candidature externe
                </h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleLogPlatformApplication} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nom de l&apos;entreprise <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Capgemini, OCP, Sofrecom, Amazon..."
                  value={platformCompany}
                  onChange={(e) => setPlatformCompany(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#ff5722] focus:outline-none focus:ring-1 focus:ring-[#ff5722]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Intitulé du poste
                </label>
                <input
                  type="text"
                  value={platformPosition}
                  onChange={(e) => setPlatformPosition(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#ff5722] focus:outline-none focus:ring-1 focus:ring-[#ff5722]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Plateforme utilisée
                </label>
                <select
                  value={platformChannel}
                  onChange={(e) => setPlatformChannel(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#ff5722] focus:outline-none focus:ring-1 focus:ring-[#ff5722] bg-white"
                >
                  <option value="LinkedIn">LinkedIn Easy Apply / RH</option>
                  <option value="Site Carrière">Site Carrière de l&apos;entreprise</option>
                  <option value="Welcome to the Jungle">Welcome to the Jungle</option>
                  <option value="Indeed">Indeed</option>
                  <option value="ReKrute">ReKrute</option>
                  <option value="Autre">Autre canal</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="editorial-button-secondary h-8 px-3 text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !platformCompany.trim()}
                  className="editorial-button-primary h-8 px-4 text-xs inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    "Enregistrement..."
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Valider l&apos;action (+1)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
