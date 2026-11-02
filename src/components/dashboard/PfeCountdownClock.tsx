"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Clock,
  Sparkles,
  Calendar,
  Flame,
  Layers,
  Palette,
  Timer,
  Compass,
  Zap,
} from "lucide-react";

type ThemeMode = "split-flap" | "vintage-odometer" | "minimal-luxury";

const TARGET_DATE = new Date("2027-02-01T09:00:00");
const START_DATE = new Date("2026-09-01T00:00:00"); // Début de l'année scolaire 5A ENSA
const STORAGE_KEY_THEME = "mailpilot_countdown_theme_variant";

export default function PfeCountdownClock() {
  const [theme, setTheme] = useState<ThemeMode>("split-flap");
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
  });

  // Charger le thème favori
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
    if (stored && ["split-flap", "vintage-odometer", "minimal-luxury"].includes(stored)) {
      setTheme(stored);
    }
  }, []);

  const changeTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem(STORAGE_KEY_THEME, newTheme);
  };

  // Horloge temps réel avec mise à jour chaque seconde
  useEffect(() => {
    function calculateTime() {
      const now = new Date();
      const diffMs = Math.max(0, TARGET_DATE.getTime() - now.getTime());

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
      const seconds = Math.floor((diffMs / 1000) % 60);
      const totalSeconds = Math.floor(diffMs / 1000);

      setTimeLeft({ days, hours, minutes, seconds, totalSeconds });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calcul du pourcentage de progression vers le 1er Février 2027
  const progressPercent = useMemo(() => {
    const totalTimeSpan = TARGET_DATE.getTime() - START_DATE.getTime();
    const elapsed = Date.now() - START_DATE.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / totalTimeSpan) * 100)));
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="mb-8 overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-xs transition-all duration-300">
      {/* 1. Header du Compteur avec sélecteur de design */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-[#ff5722]">
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 sm:text-sm">
                Compte à Rebours PFE 2027
              </h3>
              <span className="rounded-full bg-[#ff5722] px-2 py-0.2 text-[10px] font-black text-white">
                1er FÉVRIER 2027
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Début officiel du Stage de Fin d&apos;Études (ENSA Tanger) • Prise de poste en entreprise
            </p>
          </div>
        </div>

        {/* 3 Styles Rétro & Élégants au Choix */}
        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200/80 bg-white p-1 text-xs shadow-2xs">
          <Palette className="h-3.5 w-3.5 text-gray-400 ml-1.5 mr-0.5 hidden sm:block" />
          <button
            onClick={() => changeTheme("split-flap")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
              theme === "split-flap"
                ? "bg-gray-900 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title="Style Horloge à volets mécaniques (Split-Flap vintage)"
          >
            📟 Flip Clock
          </button>
          <button
            onClick={() => changeTheme("vintage-odometer")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
              theme === "vintage-odometer"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title="Style Odomètre vintage & cuivre"
          >
            🧭 Odomètre Rétro
          </button>
          <button
            onClick={() => changeTheme("minimal-luxury")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
              theme === "minimal-luxury"
                ? "bg-orange-500 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title="Style Studio Minimaliste Épuré"
          >
            ✨ Studio Épuré
          </button>
        </div>
      </div>

      {/* 2. LE COMPTEUR PRINCIPAL (3 VARIANTES VISUELLES SPECTACULAIRES) */}
      <div className="p-5 sm:p-7">
        {/* ========================================================
            VARIANTE 1 : FLIP CLOCK RÉTRO VINTAGE (SPLIT-FLAP SOLARI)
           ======================================================== */}
        {theme === "split-flap" && (
          <div className="rounded-2xl bg-gradient-to-b from-[#111317] via-[#1a1d24] to-[#0f1115] p-5 sm:p-7 shadow-2xl border border-gray-800">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              {/* Carte Jours */}
              <div className="flex flex-col items-center">
                <div className="relative flex h-20 w-20 sm:h-26 sm:w-26 items-center justify-center rounded-xl bg-gradient-to-b from-[#232731] via-[#1c1f27] to-[#121419] border border-gray-700/60 shadow-inner">
                  {/* Charnière centrale du volet */}
                  <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-[#0c0d10] shadow-[0_1px_1px_rgba(255,255,255,0.08)] z-10" />
                  <div className="absolute -left-1 top-1/2 -mt-1 h-2 w-1 rounded-r-xs bg-gray-600" />
                  <div className="absolute -right-1 top-1/2 -mt-1 h-2 w-1 rounded-l-xs bg-gray-600" />

                  <span className="font-mono text-3xl sm:text-5xl font-black text-gray-100 tracking-tight tabular-nums select-none drop-shadow-md">
                    {timeLeft.days}
                  </span>
                </div>
                <span className="mt-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-orange-400">
                  JOURS
                </span>
              </div>

              {/* Séparateur mécanique à deux points */}
              <div className="hidden sm:flex flex-col gap-3 self-center pb-6">
                <span className="h-2 w-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 animate-pulse" />
              </div>

              {/* Carte Heures */}
              <div className="flex flex-col items-center">
                <div className="relative flex h-20 w-20 sm:h-26 sm:w-26 items-center justify-center rounded-xl bg-gradient-to-b from-[#232731] via-[#1c1f27] to-[#121419] border border-gray-700/60 shadow-inner">
                  <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-[#0c0d10] shadow-[0_1px_1px_rgba(255,255,255,0.08)] z-10" />
                  <div className="absolute -left-1 top-1/2 -mt-1 h-2 w-1 rounded-r-xs bg-gray-600" />
                  <div className="absolute -right-1 top-1/2 -mt-1 h-2 w-1 rounded-l-xs bg-gray-600" />

                  <span className="font-mono text-3xl sm:text-5xl font-black text-gray-100 tracking-tight tabular-nums select-none drop-shadow-md">
                    {pad(timeLeft.hours)}
                  </span>
                </div>
                <span className="mt-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400">
                  HEURES
                </span>
              </div>

              {/* Séparateur mécanique à deux points */}
              <div className="hidden sm:flex flex-col gap-3 self-center pb-6">
                <span className="h-2 w-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 animate-pulse" />
              </div>

              {/* Carte Minutes */}
              <div className="flex flex-col items-center">
                <div className="relative flex h-20 w-20 sm:h-26 sm:w-26 items-center justify-center rounded-xl bg-gradient-to-b from-[#232731] via-[#1c1f27] to-[#121419] border border-gray-700/60 shadow-inner">
                  <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-[#0c0d10] shadow-[0_1px_1px_rgba(255,255,255,0.08)] z-10" />
                  <div className="absolute -left-1 top-1/2 -mt-1 h-2 w-1 rounded-r-xs bg-gray-600" />
                  <div className="absolute -right-1 top-1/2 -mt-1 h-2 w-1 rounded-l-xs bg-gray-600" />

                  <span className="font-mono text-3xl sm:text-5xl font-black text-gray-100 tracking-tight tabular-nums select-none drop-shadow-md">
                    {pad(timeLeft.minutes)}
                  </span>
                </div>
                <span className="mt-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400">
                  MINUTES
                </span>
              </div>

              {/* Séparateur mécanique à deux points */}
              <div className="hidden sm:flex flex-col gap-3 self-center pb-6">
                <span className="h-2 w-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 animate-pulse" />
              </div>

              {/* Carte Secondes (avec accent chaud animé) */}
              <div className="flex flex-col items-center">
                <div className="relative flex h-20 w-20 sm:h-26 sm:w-26 items-center justify-center rounded-xl bg-gradient-to-b from-[#2d2119] via-[#241a13] to-[#18110c] border border-orange-500/50 shadow-inner ring-1 ring-orange-500/30">
                  <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-[#0c0d10] shadow-[0_1px_1px_rgba(255,255,255,0.08)] z-10" />
                  <div className="absolute -left-1 top-1/2 -mt-1 h-2 w-1 rounded-r-xs bg-orange-600" />
                  <div className="absolute -right-1 top-1/2 -mt-1 h-2 w-1 rounded-l-xs bg-orange-600" />

                  <span className="font-mono text-3xl sm:text-5xl font-black text-[#ff7043] tracking-tight tabular-nums select-none drop-shadow-md">
                    {pad(timeLeft.seconds)}
                  </span>
                </div>
                <span className="mt-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#ff5722]">
                  SECONDES
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VARIANTE 2 : ODOMÈTRE RÉTRO & CHRONO CUIVRE/AMBRE
           ======================================================== */}
        {theme === "vintage-odometer" && (
          <div className="rounded-2xl bg-gradient-to-br from-[#2a1b12] via-[#1f150e] to-[#140d09] p-5 sm:p-7 shadow-2xl border-2 border-[#b45309]/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
              {/* Odomètre Jours */}
              <div className="rounded-2xl border border-amber-500/30 bg-[#1a110a] p-4 shadow-inner relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                <span className="block font-mono text-3xl sm:text-5xl font-extrabold text-amber-200 tracking-wider">
                  {timeLeft.days}
                </span>
                <span className="mt-1 block text-[10px] sm:text-xs font-black tracking-widest text-amber-400/90 uppercase">
                  JOURS RESTANTS
                </span>
              </div>

              {/* Odomètre Heures */}
              <div className="rounded-2xl border border-amber-500/20 bg-[#1a110a] p-4 shadow-inner">
                <span className="block font-mono text-3xl sm:text-5xl font-extrabold text-amber-100 tracking-wider">
                  {pad(timeLeft.hours)}
                </span>
                <span className="mt-1 block text-[10px] sm:text-xs font-black tracking-widest text-amber-500/70 uppercase">
                  HEURES
                </span>
              </div>

              {/* Odomètre Minutes */}
              <div className="rounded-2xl border border-amber-500/20 bg-[#1a110a] p-4 shadow-inner">
                <span className="block font-mono text-3xl sm:text-5xl font-extrabold text-amber-100 tracking-wider">
                  {pad(timeLeft.minutes)}
                </span>
                <span className="mt-1 block text-[10px] sm:text-xs font-black tracking-widest text-amber-500/70 uppercase">
                  MINUTES
                </span>
              </div>

              {/* Odomètre Secondes */}
              <div className="rounded-2xl border border-orange-500/50 bg-[#28150c] p-4 shadow-inner ring-1 ring-orange-500/40">
                <span className="block font-mono text-3xl sm:text-5xl font-extrabold text-orange-400 tracking-wider animate-pulse">
                  {pad(timeLeft.seconds)}
                </span>
                <span className="mt-1 block text-[10px] sm:text-xs font-black tracking-widest text-orange-400 uppercase">
                  SECONDES
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VARIANTE 3 : STUDIO ÉPURÉ & ÉLÉGANT (EDITORIAL WHITE & ORANGE)
           ======================================================== */}
        {theme === "minimal-luxury" && (
          <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/40 via-white to-amber-50/20 p-5 sm:p-7 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
              <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-xs">
                <span className="block text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
                  {timeLeft.days}
                </span>
                <span className="mt-1 block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#ff5722]">
                  Jours
                </span>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
                <span className="block text-3xl sm:text-5xl font-black text-gray-800 tracking-tight">
                  {pad(timeLeft.hours)}
                </span>
                <span className="mt-1 block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Heures
                </span>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
                <span className="block text-3xl sm:text-5xl font-black text-gray-800 tracking-tight">
                  {pad(timeLeft.minutes)}
                </span>
                <span className="mt-1 block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Minutes
                </span>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 shadow-xs">
                <span className="block text-3xl sm:text-5xl font-black text-[#ff5722] tracking-tight">
                  {pad(timeLeft.seconds)}
                </span>
                <span className="mt-1 block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#ff5722]">
                  Secondes
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Barre de Sprint & Contexte Stratégique */}
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#ff5722]" />
              <span className="text-xs font-bold text-gray-800">
                Progression du Sprint PFE (Septembre 2026 $\rightarrow$ Février 2027)
              </span>
            </div>
            <span className="text-xs font-bold text-gray-600">
              {progressPercent}% du compte à rebours écoulé
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#ff5722] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between text-[11px] text-gray-500">
            <span>
              🎯 Objectif : Avoir <strong>2 à 3 offres signées</strong> avant mi-janvier 2027 pour démarrer sereinement.
            </span>
            <span className="font-semibold text-gray-700">
              {timeLeft.days} jours restants pour faire la différence
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
