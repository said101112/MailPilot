"use client";

import { useState } from "react";
import { Check, Copy, HelpCircle, Lightbulb, MessageSquare, PhoneCall, Sparkles, User, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DialogueTurn, ExpressionItem } from "@/lib/tracker/expressions";

interface DialogueViewerProps {
  item: ExpressionItem;
  onEdit?: (item: ExpressionItem) => void;
  onDelete?: (id: string) => void;
  isCompact?: boolean;
}

export default function DialogueViewer({ item, onEdit, onDelete, isCompact = false }: DialogueViewerProps) {
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);

  const copyText = (text: string, id: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedTurnId(id);
    toast.success(`${label} copié dans le presse-papier !`);
    setTimeout(() => setCopiedTurnId(null), 2000);
  };

  const copyEntireDialogue = () => {
    if (!item.turns || item.turns.length === 0) return;
    const fullText = item.turns
      .map((t) => {
        let line = `${t.speakerLabel || (t.speaker === "rh" ? "RH" : "Toi")} : ${t.text}`;
        if (t.alternative) {
          line += `\n(Variante : ${t.alternative})`;
        }
        return line;
      })
      .join("\n\n");

    void navigator.clipboard.writeText(fullText);
    toast.success("Dialogue complet copié !");
  };

  const turns = item.turns || [];

  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs transition-all", isCompact && "p-3")}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-[#ff5722]">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 sm:text-base">{item.title}</h3>
            {item.tags && item.tags.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyEntireDialogue}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            title="Copier tout le scénario"
          >
            <Copy className="h-3 w-3" />
            <span className="hidden sm:inline">Copier tout</span>
          </button>
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="mt-4 space-y-3.5">
        {turns.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400 italic">Aucune réplique dans ce scénario.</p>
        ) : (
          turns.map((turn, idx) => {
            const isRh = turn.speaker === "rh";
            const speakerName = turn.speakerLabel || (isRh ? "Recruteur / RH" : "Toi (Candidat)");
            const isCandidate = turn.speaker === "candidate";

            return (
              <div key={turn.id || idx} className="space-y-1.5">
                <div
                  className={cn(
                    "flex items-start gap-2.5",
                    isCandidate ? "justify-end flex-row-reverse" : "justify-start"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isRh
                        ? "bg-gray-200 text-gray-700"
                        : "bg-orange-500 text-white shadow-2xs"
                    )}
                    title={speakerName}
                  >
                    {isRh ? "RH" : <UserCheck className="h-3.5 w-3.5" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "relative group max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs",
                      isRh
                        ? "bg-gray-100 text-gray-800 rounded-tl-xs border border-gray-200/70"
                        : "bg-[#fff7f4] text-gray-900 rounded-tr-xs border border-orange-200/90 font-medium"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          isRh ? "text-gray-500" : "text-[#ff5722]"
                        )}
                      >
                        {speakerName}
                      </span>

                      {/* Quick copy button */}
                      <button
                        type="button"
                        onClick={() => copyText(turn.text, turn.id, "Réplique")}
                        className="opacity-60 hover:opacity-100 transition p-0.5 rounded text-gray-400 hover:text-gray-700"
                        title="Copier cette réplique"
                      >
                        {copiedTurnId === turn.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <p className="whitespace-pre-wrap">{turn.text}</p>
                  </div>
                </div>

                {/* Alternative response box (if candidate has a more natural alternative) */}
                {turn.alternative && (
                  <div className="flex justify-end pr-9">
                    <div className="max-w-[80%] sm:max-w-[70%] rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-950 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px]">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                          <span>Ou plus naturellement :</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(turn.alternative!, `${turn.id}-alt`, "Variante")}
                          className="opacity-60 hover:opacity-100 transition p-0.5 rounded text-amber-800 hover:text-amber-950"
                          title="Copier la variante"
                        >
                          {copiedTurnId === `${turn.id}-alt` ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <p className="font-medium italic leading-relaxed text-amber-900">
                        « {turn.alternative} »
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Advice / Note Box */}
      {item.notes && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50/70 border border-blue-100 p-2.5 text-xs text-blue-900">
          <HelpCircle className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
          <div>
            <span className="font-bold text-blue-800">Conseil d'intonation : </span>
            <span className="text-blue-900/90">{item.notes}</span>
          </div>
        </div>
      )}
    </div>
  );
}

