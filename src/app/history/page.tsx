"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { History as HistoryIcon, Trash2, ExternalLink, CheckCircle2, Clock, Mail, ShieldCheck, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface HistoryItem {
  id: string;
  date: string;
  company: string;
  position: string;
  email: string;
  status: "success" | "error";
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedHistory = data.map((item: any) => ({
        id: item.id,
        date: item.created_at,
        company: item.company,
        position: item.position,
        email: item.email,
        status: item.status
      }));

      setHistory(formattedHistory);
    } catch (error: any) {
      console.error("Erreur chargement historique:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Voulez-vous vraiment effacer tout votre historique ?")) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setHistory([]);
      toast.success("Historique effacé");
    } catch (error: any) {
      toast.error("Erreur : " + error.message);
    }
  };

  const deleteItem = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setHistory(prev => prev.filter(item => item.id !== id));
      toast.success("Entrée supprimée");
    } catch (error: any) {
      toast.error("Erreur : " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0C1220] border border-[#1F2937] rounded-full text-[9px] font-bold text-blue-400 uppercase tracking-[0.15em]">
              <Clock className="w-3 h-3" /> Journal d'activité
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Historique <span className="text-blue-500">d'envoi</span></h1>
            <p className="text-[#9CA3AF] text-sm">Suivez l'état de toutes vos candidatures.</p>
          </div>
          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              className="flex items-center gap-2 px-3 py-2 border border-red-500/20 bg-red-500/5 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Effacer tout
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="saas-card rounded-2xl p-16 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-base font-bold text-white">Chargement...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="saas-card rounded-2xl p-12 md:p-16 text-center space-y-4 flex flex-col items-center">
            <div className="p-5 bg-[#0C1220] rounded-2xl border border-[#1F2937]">
              <HistoryIcon className="w-10 h-10 text-[#374151]" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-black text-white">Historique vide</p>
              <p className="text-[#9CA3AF] text-sm">Vos candidatures apparaîtront ici.</p>
            </div>
            <Link href="/apply" className="btn-saas-primary px-6 py-2.5 rounded-xl text-sm font-bold mt-2">
              Lancer un envoi
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {history.map((item) => (
              <div 
                key={item.id} 
                className="group saas-card rounded-2xl p-5 md:p-7 flex items-center justify-between gap-6 hover:border-blue-500/30 transition-all shadow-lg shadow-black/20"
              >
                <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                  <div className={cn(
                    "w-12 h-12 md:w-16 md:h-16 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner",
                    item.status === "success" 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                      : "bg-red-500/10 border-red-500/20 text-red-500"
                  )}>
                    {item.status === "success" ? <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" /> : <XCircle className="w-6 h-6 md:w-8 md:h-8" />}
                  </div>
                  
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-black text-white text-base md:text-xl truncate tracking-tight">{item.company || "—"}</span>
                      {item.position && (
                        <span className="px-2 py-1 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest hidden sm:inline-block">
                          {item.position}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs md:text-sm text-[#9CA3AF] font-medium">
                      <span className="flex items-center gap-2 truncate"><Mail className="w-4 h-4 opacity-40" /> {item.email}</span>
                      <span className="flex items-center gap-2 shrink-0"><Clock className="w-4 h-4 opacity-40" /> {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-8 shrink-0">
                  <div className="hidden md:flex flex-col items-end gap-1">
                    <p className="text-[10px] font-black text-[#4B5563] uppercase tracking-[0.2em]">Statut envoi</p>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full animate-pulse", item.status === "success" ? "bg-emerald-500" : "bg-red-500")} />
                      <span className={cn(
                        "text-xs md:text-sm font-black uppercase tracking-widest",
                        item.status === "success" ? "text-emerald-500" : "text-red-500"
                      )}>
                        {item.status === "success" ? "Délivré" : "Échec"}
                      </span>
                    </div>
                  </div>
                  <div className="w-px h-12 bg-[#1F2937] hidden md:block" />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                      disabled={deletingId === item.id}
                      className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#0C1220] border border-[#1F2937] rounded-xl text-[#4B5563] hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10 transition-all shadow-sm disabled:opacity-50"
                      title="Supprimer cette entrée"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                    <button className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#0C1220] border border-[#1F2937] rounded-xl text-[#4B5563] hover:text-white hover:border-blue-500/50 hover:bg-blue-600/10 transition-all shadow-sm">
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
