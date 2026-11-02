"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Clock,
  Sparkles,
  Calendar,
  Flame,
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
    <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-xs transition-all duration-300 sm:px-5 sm:py-3.5">
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
        {/* 1. Titre & Contexte PFE (Gauche) */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#ff5722] shadow-xs">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-gray-900">
                Compte à Rebours PFE 2027
              </span>
              <span className="rounded-full bg-[#ff5722] px-2 py-0.2 text-[10px] font-black text-white">
                1er FÉVRIER 2027
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Septembre 2026 → Février 2027 • Démarrage Stage PFE ENSA Tanger
            </p>
          </div>
        </div>

        {/* 2. Le Compteur Horizontal Rétro & Compact (Centre) */}
        <div className="flex items-center justify-center">
          {/* VARIANTE 1 : FLIP CLOCK RÉTRO COMPACT */}
          {theme === "split-flap" && (
            <div className="flex items-center gap-1.5 rounded-xl bg-[#12141a] px-3.5 py-2 border border-gray-800 shadow-md">
              {/* Jours */}
              <div className="relative flex flex-col items-center">
                <div className="relative flex h-10 min-w-10 px-1.5 items-center justify-center rounded-lg bg-gradient-to-b from-[#252a36] via-[#1c202a] to-[#14171f] border border-gray-700/60 shadow-inner">
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/80 z-10" />
                  <span className="font-mono text-base font-black text-white tracking-tight tabular-nums select-none">
                    {timeLeft.days}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-orange-400 mt-0.5">
                  JOURS
                </span>
              </div>

              <span className="text-orange-500 font-bold font-mono text-sm pb-3 animate-pulse">
                :
              </span>

              {/* Heures */}
              <div className="relative flex flex-col items-center">
                <div className="relative flex h-10 w-9 items-center justify-center rounded-lg bg-gradient-to-b from-[#252a36] via-[#1c202a] to-[#14171f] border border-gray-700/60 shadow-inner">
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/80 z-10" />
                  <span className="font-mono text-base font-black text-gray-100 tracking-tight tabular-nums select-none">
                    {pad(timeLeft.hours)}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 mt-0.5">
                  HEURES
                </span>
              </div>

              <span className="text-orange-500 font-bold font-mono text-sm pb-3 animate-pulse">
                :
              </span>

              {/* Minutes */}
              <div className="relative flex flex-col items-center">
                <div className="relative flex h-10 w-9 items-center justify-center rounded-lg bg-gradient-to-b from-[#252a36] via-[#1c202a] to-[#14171f] border border-gray-700/60 shadow-inner">
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/80 z-10" />
                  <span className="font-mono text-base font-black text-gray-100 tracking-tight tabular-nums select-none">
                    {pad(timeLeft.minutes)}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 mt-0.5">
                  MIN
                </span>
              </div>

              <span className="text-orange-500 font-bold font-mono text-sm pb-3 animate-pulse">
                :
              </span>

              {/* Secondes */}
              <div className="relative flex flex-col items-center">
                <div className="relative flex h-10 w-9 items-center justify-center rounded-lg bg-gradient-to-b from-[#352317] via-[#2a1a11] to-[#1a110a] border border-orange-500/50 shadow-inner ring-1 ring-orange-500/30">
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/80 z-10" />
                  <span className="font-mono text-base font-black text-[#ff7043] tracking-tight tabular-nums select-none">
                    {pad(timeLeft.seconds)}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#ff5722] mt-0.5">
                  SEC
                </span>
              </div>
            </div>
          )}

          {/* VARIANTE 2 : ODOMÈTRE RÉTRO CUIVRE COMPACT */}
          {theme === "vintage-odometer" && (
            <div className="flex items-center gap-1.5 rounded-xl bg-[#1b120c] px-3.5 py-2 border border-amber-600/50 shadow-md">
              <div className="flex flex-col items-center">
                <div className="flex h-10 min-w-10 px-1.5 items-center justify-center rounded-lg bg-[#27170c] border border-amber-500/30">
                  <span className="font-mono text-base font-extrabold text-amber-200 tabular-nums">
                    {timeLeft.days}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 mt-0.5">
                  JOURS
                </span>
              </div>

              <span className="text-amber-500 font-bold font-mono text-sm pb-3">:</span>

              <div className="flex flex-col items-center">
                <div className="flex h-10 w-9 items-center justify-center rounded-lg bg-[#27170c] border border-amber-500/20">
                  <span className="font-mono text-base font-extrabold text-amber-100 tabular-nums">
                    {pad(timeLeft.hours)}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-500/80 mt-0.5">
                  H
                </span>
              </div>

              <span className="text-amber-500 font-bold font-mono text-sm pb-3">:</span>

              <div className="flex flex-col items-center">
                <div className="flex h-10 w-9 items-center justify-center rounded-lg bg-[#27170c] border border-amber-500/20">
                  <span className="font-mono text-base font-extrabold text-amber-100 tabular-nums">
                    {pad(timeLeft.minutes)}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-500/80 mt-0.5">
                  MIN
                </span>
              </div>

              <span className="text-orange-500 font-bold font-mono text-sm pb-3">:</span>

              <div className="flex flex-col items-center">
                <div className="flex h-10 w-9 items-center justify-center rounded-lg bg-[#3d1d0c] border border-orange-500/60 ring-1 ring-orange-500/30">
                  <span className="font-mono text-base font-extrabold text-orange-400 tabular-nums animate-pulse">
                    {pad(timeLeft.seconds)}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-orange-400 mt-0.5">
                  SEC
                </span>
              </div>
            </div>
          )}

          {/* VARIANTE 3 : STUDIO ÉPURÉ COMPACT */}
          {theme === "minimal-luxury" && (
            <div className="flex items-center gap-1.5 rounded-xl border border-orange-200/80 bg-orange-50/40 px-3 py-1.5">
              <div className="flex items-baseline gap-1">
                <span className="font-sans text-lg font-black text-gray-900 tabular-nums">
                  {timeLeft.days}
                </span>
                <span className="text-[10px] font-bold text-[#ff5722] uppercase">j</span>
              </div>
              <span className="text-gray-300 font-bold">:</span>
              <div className="flex items-baseline gap-1">
                <span className="font-sans text-lg font-black text-gray-800 tabular-nums">
                  {pad(timeLeft.hours)}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">h</span>
              </div>
              <span className="text-gray-300 font-bold">:</span>
              <div className="flex items-baseline gap-1">
                <span className="font-sans text-lg font-black text-gray-800 tabular-nums">
                  {pad(timeLeft.minutes)}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">m</span>
              </div>
              <span className="text-gray-300 font-bold">:</span>
              <div className="flex items-baseline gap-1 rounded-md bg-orange-100/80 px-1.5 py-0.5">
                <span className="font-sans text-lg font-black text-[#ff5722] tabular-nums">
                  {pad(timeLeft.seconds)}
                </span>
                <span className="text-[10px] font-black text-[#ff5722] uppercase">s</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Progression du Sprint & Switcher de Thème (Droite) */}
        <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
          <div className="flex flex-col items-start lg:items-end">
            <span className="text-[10px] font-semibold text-gray-400">
              Sprint PFE 2027
            </span>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-[#ff5722]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700">
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Boutons Thèmes Compacts */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50/80 p-0.5">
            <button
              onClick={() => changeTheme("split-flap")}
              className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all ${
                theme === "split-flap"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Flip Clock"
            >
              📟 Flip
            </button>
            <button
              onClick={() => changeTheme("vintage-odometer")}
              className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all ${
                theme === "vintage-odometer"
                  ? "bg-amber-700 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Odomètre Rétro"
            >
              🧭 Odomètre
            </button>
            <button
              onClick={() => changeTheme("minimal-luxury")}
              className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all ${
                theme === "minimal-luxury"
                  ? "bg-[#ff5722] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Studio Épuré"
            >
              ✨ Épuré
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
