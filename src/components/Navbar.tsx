"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Send, Layers, Truck, Home, History as HistoryIcon, LogOut, Menu, X, FileText, Upload, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const navigation = [
  { name: "Dash", href: "/", icon: Home },
  { name: "Apply", href: "/apply", icon: Send },
  { name: "Bulk", href: "/upload", icon: Layers },
  { name: "History", href: "/history", icon: HistoryIcon },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("Utilisateur");
  const [cvLink, setCvLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("truck-app-candidate-name");
    const savedCv = localStorage.getItem("truck-app-cv-base64");
    if (savedName) setCandidateName(savedName);
    if (savedCv) setCvLink(savedCv);
  }, []);

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Veuillez sélectionner un fichier PDF");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier est trop lourd (max 2Mo)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64Full = reader.result as string;
        // On enlève le préfixe "data:application/pdf;base64," pour n8n
        const base64Raw = base64Full.split(',')[1]; 
        
        console.log("CV converti en Base64 Pur, taille:", base64Raw.length);
        setCvLink(base64Full); // On garde le full pour l'affichage navigateur
        localStorage.setItem("truck-app-cv-base64", base64Raw); // On stocke le RAW pour n8n
        toast.success("CV chargé et prêt !");
      } catch (err) {
        console.error("Erreur lecture fichier:", err);
        toast.error("Erreur lors de la lecture du fichier");
      }
    };
    reader.onerror = () => toast.error("Erreur technique lors de la lecture");
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erreur lors de la déconnexion");
    } else {
      toast.success("Déconnecté");
      router.push("/login");
    }
  };

  if (pathname === "/login") return null;

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0A0F1C]/95 backdrop-blur-xl border-b border-[#1F2937] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Truck className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-base font-bold text-white">TruckApply</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#111827] border border-[#1F2937] text-white"
        >
          {mobileOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Slide-Out Menu */}
      <div className={cn(
        "md:hidden fixed top-[57px] left-0 right-0 z-40 bg-[#0A0F1C] border-b border-[#1F2937] transition-all duration-300 ease-out",
        mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      )}>
        <nav className="px-4 py-3 flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                  isActive
                    ? "text-white bg-blue-600"
                    : "text-[#9CA3AF] hover:text-white hover:bg-[#111827]"
                )}
              >
                <item.icon className="w-4.5 h-4.5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={() => { setMobileOpen(false); handleLogout(); }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-400/10 transition-all mt-1"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Déconnexion</span>
          </button>
        </nav>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[260px] min-h-screen bg-[#0A0F1C] border-r border-[#1F2937] flex-col sticky top-0 shadow-2xl shadow-black/50 z-20">
        <div className="p-8">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-900/40 group-hover:scale-110 transition-all duration-300">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white">TruckApply</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-black text-[#4B5563] uppercase tracking-[0.25em] px-4 mb-3 opacity-60">Principale</p>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300",
                  isActive
                    ? "text-white bg-blue-600 shadow-xl shadow-blue-900/30"
                    : "text-[#9CA3AF] hover:text-white hover:bg-[#111827] border border-transparent hover:border-[#1F2937]"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-white" : "text-[#4B5563] group-hover:text-blue-400")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1F2937] flex flex-col gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-[#9CA3AF] hover:text-red-400 hover:bg-red-400/10 transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span>Déconnexion</span>
          </button>
          
          <div className="mt-2 px-4 py-4 bg-[#111827] border border-[#1F2937] rounded-2xl flex flex-col gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-[10px] font-black text-blue-400 uppercase">S</span>
              </div>
              <div className="flex flex-col min-w-0">
                <input 
                  type="text"
                  value={candidateName}
                  onChange={(e) => {
                    setCandidateName(e.target.value);
                    localStorage.setItem("truck-app-candidate-name", e.target.value);
                  }}
                  placeholder="Votre Nom"
                  className="bg-transparent text-sm font-black text-white truncate outline-none border-b border-transparent focus:border-blue-500/50 w-full"
                />
                <span className="text-[10px] font-bold text-[#4B5563] uppercase tracking-widest">Pro Plan</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-[#4B5563] uppercase tracking-wider">Mon CV (PDF)</label>
              <div className="flex items-center gap-2">
                {cvLink ? (
                  <div className="flex-1 flex items-center justify-between px-3 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] text-blue-400 font-bold truncate">CV_Chargé.pdf</span>
                    </div>
                    <button 
                      onClick={() => {
                        setCvLink("");
                        localStorage.removeItem("truck-app-cv-base64");
                      }}
                      className="p-1 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0A0F1C] border border-[#1F2937] rounded-xl hover:border-blue-500/50 hover:bg-blue-600/5 transition-all group"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#4B5563] group-hover:text-blue-400 transition-colors" />
                    )}
                    <span className="text-[10px] font-bold text-[#9CA3AF] group-hover:text-white transition-colors">
                      {isUploading ? "Chargement..." : "Télécharger PDF"}
                    </span>
                  </button>
                )}
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCvUpload}
                  accept=".pdf"
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
