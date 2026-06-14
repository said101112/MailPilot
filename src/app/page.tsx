"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Send, Layers, Sparkles, Target, Zap, Clock, ShieldCheck, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [appCount, setAppCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { count, error } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });
      
      if (!error) setAppCount(count);
    };
    fetchStats();
  }, []);

  const stats = [
    { label: "Candidatures", value: appCount !== null ? appCount.toString() : "...", icon: Send, color: "text-blue-500" },
    { label: "Modèles Actifs", value: "3", icon: Sparkles, color: "text-amber-400" },
    { label: "Analyse IA", value: "Active", icon: BarChart3, color: "text-blue-400" },
    { label: "Système", value: "OK", icon: ShieldCheck, color: "text-emerald-400" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight leading-tight">
              Tableau de <span className="text-blue-500">Bord</span>
            </h1>
            <p className="text-sm text-[#9CA3AF]">
              Suivez vos performances et gérez vos envois.
            </p>
          </div>
          <Link href="/apply" className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Nouvel Envoi
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="saas-card rounded-[2rem] p-7 flex flex-col gap-4 group hover:border-blue-500/50 transition-all relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-all" />
              
              <div className={`p-3 bg-[#0C1220] border border-[#1F2937] rounded-2xl ${stat.color} w-fit group-hover:scale-110 transition-transform shadow-lg shadow-black/20`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-black text-[#4B5563] uppercase tracking-[0.2em] mb-1 opacity-80">{stat.label}</p>
                <p className="text-3xl lg:text-4xl font-black text-white tracking-tighter">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart */}
          <div className="lg:col-span-2 saas-card rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Activité d'Envoi</h3>
                <p className="text-xs text-[#9CA3AF]">Volume sur les 7 derniers jours</p>
              </div>
              <div className="flex items-center gap-1 bg-[#0C1220] border border-[#1F2937] p-0.5 rounded-lg">
                <button className="px-3 py-1 text-[10px] font-bold text-white bg-blue-600 rounded-md">7J</button>
                <button className="px-3 py-1 text-[10px] font-bold text-[#4B5563] hover:text-white transition-colors">30J</button>
              </div>
            </div>
            
            <div className="h-[220px] w-full relative pt-2">
              <div className="absolute inset-0 flex items-end justify-around px-4 pb-1">
                {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                  <div key={i} className="flex-1 max-w-16 mx-1 bg-blue-600/20 rounded-t-lg relative group transition-all hover:bg-blue-600/40" style={{ height: `${h}%` }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-7 bg-[#1F2937] text-white text-[9px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {h} mails
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 border-b border-[#1F2937] flex flex-col justify-between opacity-30 pointer-events-none">
                <div className="border-t border-[#1F2937]/30 w-full" />
                <div className="border-t border-[#1F2937]/30 w-full" />
                <div className="border-t border-[#1F2937]/30 w-full" />
              </div>
            </div>
            
            <div className="flex justify-around px-4 text-[10px] font-bold text-[#4B5563] uppercase tracking-widest">
              <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            <div className="saas-card rounded-2xl p-5 space-y-4">
              <h3 className="text-lg font-bold text-white">Actions Rapides</h3>
              <div className="grid gap-3">
                <Link href="/apply" className="flex items-center gap-3 p-3.5 bg-[#0C1220] border border-[#1F2937] rounded-xl hover:border-blue-500/50 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Mode Manuel</p>
                    <p className="text-xs text-[#4B5563]">Envoi unique précis</p>
                  </div>
                </Link>
                <Link href="/upload" className="flex items-center gap-3 p-3.5 bg-[#0C1220] border border-[#1F2937] rounded-xl hover:border-blue-400/50 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-blue-400/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-400 group-hover:text-white transition-all">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Mode Bulk</p>
                    <p className="text-xs text-[#4B5563]">Automatisation massive</p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="saas-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Santé Système</h3>
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#9CA3AF]">Moteur n8n</span>
                  <span className="text-emerald-400">Stable</span>
                </div>
                <div className="w-full h-1.5 bg-[#0C1220] rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-emerald-500 rounded-full" />
                </div>
                <p className="text-[10px] text-[#4B5563] leading-relaxed">
                  Moteur à 85% de capacité. Aucune erreur détectée.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
