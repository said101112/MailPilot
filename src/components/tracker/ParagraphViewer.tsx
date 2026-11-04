"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Copy, Mic, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ExpressionItem } from "@/lib/tracker/expressions";

interface ParagraphViewerProps {
  item: ExpressionItem;
  onEdit?: (item: ExpressionItem) => void;
  onDelete?: (id: string) => void;
}

export default function ParagraphViewer({ item }: ParagraphViewerProps) {
  const content = item.paragraphContent || "";

  // Estimation of reading / speech time (avg ~140 words per minute)
  const stats = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const minutes = words / 140;
    const totalSecs = Math.round(minutes * 60);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return {
      wordCount: words,
      estimatedTime: m > 0 ? `${m}m ${s}s` : `${s}s`,
      targetSeconds: Math.max(30, totalSecs || 60),
    };
  }, [content]);

  // Practice rehearsal timer
  const [timerSeconds, setTimerSeconds] = useState(stats.targetSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setTimerSeconds(stats.targetSeconds);
    setIsRunning(false);
  }, [stats.targetSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((sec) => sec - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isRunning) {
      setIsRunning(false);
      toast.info("⏱️ Temps écoulé ! Excellent entraînement pour votre pitch.");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timerSeconds]);

  const toggleTimer = () => setIsRunning((prev) => !prev);
  const resetTimer = () => {
    setIsRunning(false);
    setTimerSeconds(stats.targetSeconds);
  };

  const copyContent = () => {
    void navigator.clipboard.writeText(content);
    toast.success("Pitch copié dans le presse-papier !");
  };

  const timerFormatted = () => {
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 sm:text-base">{item.title}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
              <span>{stats.wordCount} mots</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium text-gray-600">
                <Clock className="h-3 w-3" />
                Élocution ~{stats.estimatedTime}
              </span>
            </div>
          </div>
        </div>

        {/* Practice Timer Controls & Copy */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs">
            <span className="font-mono font-bold text-gray-800">{timerFormatted()}</span>
            <button
              type="button"
              onClick={toggleTimer}
              className="text-[#ff5722] hover:opacity-80 p-0.5 cursor-pointer"
              title={isRunning ? "Pause" : "Démarrer le chrono"}
            >
              {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={resetTimer}
              className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              title="Réinitialiser"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={copyContent}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            title="Copier le texte"
          >
            <Copy className="h-3 w-3" />
            <span className="hidden sm:inline">Copier</span>
          </button>
        </div>
      </div>

      {/* Paragraph Body with Elegant Typography */}
      <div className="rounded-xl border border-gray-100 bg-[#fbfbfa] p-4 sm:p-5 text-gray-800 leading-relaxed text-sm whitespace-pre-wrap font-serif sm:font-sans">
        {content || <span className="text-gray-400 italic">Aucun texte pour le moment.</span>}
      </div>

      {/* Note / Tip */}
      {item.notes && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 border border-amber-100 p-2.5 text-xs text-amber-900">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold text-amber-800">Conseil : </span>
            <span className="text-amber-900/90">{item.notes}</span>
          </div>
        </div>
      )}
    </div>
  );
}

