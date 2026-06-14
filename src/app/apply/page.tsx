"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Send, Loader2, Sparkles, ChevronDown, User, Mail, Building2, Briefcase, ArrowLeft, Save, Layout, FileText, CheckCircle2 } from "lucide-react";
import { sendApplication } from "@/lib/api";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const INITIAL_TEMPLATES = [
  { id: "default", name: "Candidature Standard", subject: "Candidature pour le poste de [Position] chez [Company]", message: "Bonjour [HR Name],\n\nJe me permets de vous contacter pour le poste de [Position] chez [Company]. Mon parcours et mes compétences correspondent parfaitement aux attentes de votre équipe.\n\nCordialement,\n[MyName]" },
  { id: "short", name: "Relance Rapide", subject: "Suivi : Poste [Position] @ [Company]", message: "Bonjour [HR Name],\n\nJe fais suite à ma candidature pour le poste de [Position]. Je reste très enthousiaste à l'idée de rejoindre [Company] !\n\nBien à vous,\n[MyName]" },
];

export default function ApplyPage() {
  const [loading, setLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [formData, setFormData] = useState({
    company: "",
    email: "",
    position: "",
    candidateName: "Candidat",
    message: INITIAL_TEMPLATES[0].message,
    subject: INITIAL_TEMPLATES[0].subject,
  });

  useEffect(() => {
    const saved = localStorage.getItem("truck-app-templates");
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved templates");
      }
    }
    
    const savedName = localStorage.getItem("truck-app-candidate-name");
    if (savedName) setFormData(prev => ({ ...prev, candidateName: savedName }));
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = templates.find(t => t.id === e.target.value);
    if (template) {
      setFormData(prev => ({ 
        ...prev, 
        message: template.message,
        subject: template.subject 
      }));
      toast.info(`Template mis à jour`);
    }
  };

  const getProcessedData = () => {
    const replace = (text: string) => text
      .replace(/\[Company\]/g, formData.company || "L'Entreprise")
      .replace(/\[Position\]/g, formData.position || "le poste")
      .replace(/\[MyName\]/g, formData.candidateName)
      .replace(/\[HR Name\]/g, "Responsable RH");

    return {
      subject: replace(formData.subject),
      message: replace(formData.message)
    };
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié");

      const processed = getProcessedData();
      const cvBase64 = localStorage.getItem("truck-app-cv-base64") || "";

      await sendApplication({
        ...formData,
        ...processed,
        message: processed.message.replace(/\n/g, '<br>'),
        cv_base64: cvBase64
      });

      const { error: dbError } = await supabase
        .from('applications')
        .insert([{
          user_id: user.id,
          company: formData.company || null,
          position: formData.position || null,
          email: formData.email,
          status: 'success'
        }]);

      if (dbError) throw dbError;

      toast.success("Candidature envoyée et sauvegardée !");
      setIsPreview(false);
      setFormData(prev => ({ ...prev, company: "", email: "", position: "" }));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveAsNewTemplate = () => {
    const name = prompt("Nom du modèle :");
    if (!name) return;

    const newTemplate = {
      id: Date.now().toString(),
      name,
      subject: formData.subject,
      message: formData.message
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem("truck-app-templates", JSON.stringify(updated));
    toast.success(`Modèle "${name}" sauvegardé !`);
  };

  const processed = getProcessedData();

  // Preview Mode
  if (isPreview) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsPreview(false)}
            className="w-10 h-10 flex items-center justify-center bg-[#0C1220] hover:bg-[#111827] rounded-xl border border-white/5 transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white">Révision finale</h1>
            <p className="text-[#9CA3AF] text-sm">Vérifiez avant envoi</p>
          </div>
        </div>

        <div className="saas-card rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <CheckCircle2 className="w-48 h-48 text-emerald-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            <div className="p-4 bg-[#050810]/60 rounded-xl border border-white/5 space-y-1">
              <p className="text-[9px] text-[#4B5563] uppercase font-black tracking-[0.15em] flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-blue-500" /> Destinataire
              </p>
              <p className="text-base font-bold text-white truncate">{formData.email}</p>
            </div>
            <div className="p-4 bg-[#050810]/60 rounded-xl border border-white/5 space-y-1">
              <p className="text-[9px] text-[#4B5563] uppercase font-black tracking-[0.15em] flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-blue-400" /> Entreprise
              </p>
              <p className="text-base font-bold text-white truncate">{formData.company || "—"}</p>
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="p-5 bg-[#050810]/60 rounded-xl border border-white/5 space-y-2">
              <p className="text-[9px] text-[#4B5563] uppercase font-black tracking-[0.15em]">Objet</p>
              <p className="text-lg font-extrabold text-white leading-tight">{processed.subject}</p>
            </div>
            
            <div className="p-5 bg-[#050810]/60 rounded-2xl border border-white/5 space-y-2">
              <p className="text-[9px] text-[#4B5563] uppercase font-black tracking-[0.15em]">Message</p>
              <div className="text-[#F9FAFB] whitespace-pre-wrap text-sm md:text-base leading-relaxed font-medium opacity-90">
                {processed.message}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 relative z-10">
            <button
              onClick={() => setIsPreview(false)}
              className="flex-1 bg-[#111827] hover:bg-[#1F2937] text-white py-3.5 rounded-xl font-bold transition-all border border-white/5 text-sm"
            >
              Modifier
            </button>
            <button
              disabled={loading}
              onClick={handleSend}
              className="btn-primary flex-[2] py-3.5 rounded-xl font-extrabold text-sm md:text-base flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> 
                  Confirmer l'envoi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form Mode
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold text-[9px] uppercase tracking-[0.15em] rounded-full">
              <Sparkles className="w-3 h-3" /> Candidature
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">Postulez avec <span className="text-blue-500">Excellence.</span></h1>
            <p className="text-[#9CA3AF] text-sm md:text-base">Générez des candidatures personnalisées en quelques secondes.</p>
          </div>
          
          <div className="glass-card p-3 rounded-xl flex items-center gap-3 w-full sm:w-auto">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[9px] uppercase font-black text-[#4B5563] tracking-widest">Signature</p>
              <input 
                className="bg-transparent text-sm font-bold text-white focus:outline-none w-full"
                value={formData.candidateName}
                onChange={(e) => {
                  setFormData({ ...formData, candidateName: e.target.value });
                  localStorage.setItem("truck-app-candidate-name", e.target.value);
                }}
                placeholder="Votre Nom"
              />
            </div>
          </div>
        </div>

        {/* Form Card */}
        <form 
          onSubmit={(e) => { e.preventDefault(); setIsPreview(true); }} 
          className="saas-card rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-6"
        >
          {/* Row 1: Company + Position (optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[#4B5563] uppercase tracking-[0.15em] flex items-center gap-1.5 ml-0.5">
                <Building2 className="w-3 h-3 text-blue-500" /> Entreprise <span className="text-[#374151] font-normal">(optionnel)</span>
              </label>
              <input 
                type="text" 
                className="input-saas-minimal w-full px-4 py-2.5 rounded-lg text-sm font-medium" 
                placeholder="ex: Stripe, Google..."
                value={formData.company} 
                onChange={(e) => setFormData({ ...formData, company: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[#4B5563] uppercase tracking-[0.15em] flex items-center gap-1.5 ml-0.5">
                <Briefcase className="w-3 h-3 text-blue-500" /> Poste <span className="text-[#374151] font-normal">(optionnel)</span>
              </label>
              <input 
                type="text" 
                className="input-saas-minimal w-full px-4 py-2.5 rounded-lg text-sm font-medium" 
                placeholder="ex: Product Designer..."
                value={formData.position} 
                onChange={(e) => setFormData({ ...formData, position: e.target.value })} 
              />
            </div>
          </div>

          {/* Row 2: Email + Subject (required) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[#4B5563] uppercase tracking-[0.15em] flex items-center gap-1.5 ml-0.5">
                <Mail className="w-3 h-3 text-blue-500" /> Email Recruteur
              </label>
              <input 
                required 
                type="email" 
                className="input-saas-minimal w-full px-4 py-2.5 rounded-lg text-sm font-medium" 
                placeholder="recrutement@domaine.com"
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[#4B5563] uppercase tracking-[0.15em] flex items-center gap-1.5 ml-0.5">
                <FileText className="w-3 h-3 text-blue-500" /> Sujet
              </label>
              <input 
                required 
                type="text" 
                className="input-saas-minimal w-full px-4 py-2.5 rounded-lg text-sm font-medium" 
                placeholder="Objet du message..."
                value={formData.subject} 
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })} 
              />
            </div>
          </div>

          {/* Message Section */}
          <div className="pt-5 border-t border-[#1F2937] space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#0C1220] border border-[#1F2937] rounded-lg flex items-center justify-center text-blue-500">
                  <Layout className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Corps du Message</h3>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  onChange={handleTemplateChange} 
                  className="flex-1 bg-[#0C1220] border border-[#1F2937] rounded-lg px-3 py-2 text-[9px] font-black text-white outline-none focus:border-blue-500 transition-all cursor-pointer uppercase tracking-widest"
                >
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button 
                  type="button" 
                  onClick={saveAsNewTemplate} 
                  className="p-2 bg-[#0C1220] border border-[#1F2937] rounded-lg text-blue-500 hover:text-white hover:bg-blue-600 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="relative group">
              <textarea 
                rows={6} 
                className="w-full input-saas-minimal rounded-xl p-4 text-sm leading-relaxed font-medium resize-none" 
                value={formData.message} 
                onChange={(e) => setFormData({ ...formData, message: e.target.value })} 
                placeholder="Rédigez votre message ici..."
              />
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 opacity-0 group-focus-within:opacity-100 transition-opacity">
                {["[Company]", "[Position]", "[MyName]"].map(tag => (
                  <span key={tag} className="text-[8px] font-black bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-[#4B5563]">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-saas-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
          >
            Prévisualiser <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
