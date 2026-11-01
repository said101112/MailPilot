"use client";

import { useState, useEffect } from "react";
import { Download, FileText, Settings, X, Check, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  generateCoverLetterPdf,
  getStoredCandidateProfile,
  saveStoredCandidateProfile,
} from "@/lib/coverLetterPdf";

interface CoverLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTemplate?: {
    name: string;
    subject: string;
    message: string;
  };
  initialCompany?: string;
  initialPosition?: string;
  initialContactName?: string;
}

export function CoverLetterModal({
  isOpen,
  onClose,
  defaultTemplate,
  initialCompany = "Capgemini",
  initialPosition = "Stage PFE / Emploi",
  initialContactName = "Hiring Manager",
}: CoverLetterModalProps) {
  const [profile, setProfile] = useState(getStoredCandidateProfile);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const [company, setCompany] = useState(initialCompany);
  const [position, setPosition] = useState(initialPosition);
  const [contactName, setContactName] = useState(initialContactName);
  const [messageBody, setMessageBody] = useState(
    defaultTemplate?.message ||
      "Hello Hiring Manager,\n\nI am writing to express my strong interest in the [Position] opportunity at [Company]. With a solid foundation in computer engineering, data architectures, and operational coordination, I can integrate rapidly into your team.\n\nI would welcome the opportunity to discuss my background in detail.\n\nSincerely,\n[MyName]"
  );

  useEffect(() => {
    if (defaultTemplate?.message) {
      setMessageBody(defaultTemplate.message);
    }
  }, [defaultTemplate]);

  useEffect(() => {
    if (initialCompany) setCompany(initialCompany);
    if (initialPosition) setPosition(initialPosition);
    if (initialContactName) setContactName(initialContactName);
  }, [initialCompany, initialPosition, initialContactName]);

  if (!isOpen) return null;

  const handleSaveProfile = () => {
    saveStoredCandidateProfile(profile);
    setShowProfileEdit(false);
    toast.success("Coordonnées de l'en-tête enregistrées !");
  };

  const handleDownloadPdf = () => {
    try {
      const pdf = generateCoverLetterPdf({
        candidateName: profile.name,
        candidateEmail: profile.email,
        candidatePhone: profile.phone,
        candidateCity: profile.city,
        candidateTitle: profile.title,
        company: company.trim() || "Entreprise",
        position: position.trim() || "Poste",
        contactName: contactName.trim() || "Madame, Monsieur",
        body: messageBody,
      });

      pdf.download();
      toast.success(`Lettre PDF téléchargée : ${pdf.fileName}`);
      onClose();
    } catch (e) {
      console.error("PDF generation error:", e);
      toast.error("Erreur lors de la génération du PDF.");
    }
  };

  const handlePreviewPdf = () => {
    try {
      const pdf = generateCoverLetterPdf({
        candidateName: profile.name,
        candidateEmail: profile.email,
        candidatePhone: profile.phone,
        candidateCity: profile.city,
        candidateTitle: profile.title,
        company: company.trim() || "Entreprise",
        position: position.trim() || "Poste",
        contactName: contactName.trim() || "Madame, Monsieur",
        body: messageBody,
      });

      const uri = pdf.getDataUri();
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${uri}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      } else {
        pdf.download();
      }
    } catch {
      toast.error("Impossible d'ouvrir l'aperçu PDF.");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(9,12,16,0.65)] p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex w-full max-w-[620px] flex-col max-h-[92vh] rounded-[20px] border border-[var(--editorial-border)] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.3)]">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--editorial-border)] px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">
                GÉNÉRATEUR DE LETTRE FORMELLE
              </p>
              <h2 className="text-lg font-bold text-[var(--editorial-text)]">
                Lettre de Motivation en PDF (1-Clic)
              </h2>
            </div>
          </div>
          <button
            className="editorial-icon-button"
            onClick={onClose}
            type="button"
            title="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 px-6 py-5">
          {/* Header Profile Info Bar */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  En-tête candidat : <span className="text-blue-600">{profile.name}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {[profile.title, profile.phone, profile.email, profile.city]
                    .filter(Boolean)
                    .join(" • ") || "Complétez vos coordonnées pour la lettre"}
                </p>
              </div>
              <button
                type="button"
                className="editorial-button-secondary h-7 px-2.5 text-[11px] flex items-center gap-1.5 bg-white shrink-0"
                onClick={() => setShowProfileEdit(!showProfileEdit)}
              >
                <Settings className="h-3 w-3" />
                <span>{showProfileEdit ? "Fermer" : "Modifier mes coordonnées"}</span>
              </button>
            </div>

            {/* Profile Drawer inside modal */}
            {showProfileEdit && (
              <div className="mt-3.5 pt-3.5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in slide-in-from-top-2 duration-150">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Nom & Prénom
                  </label>
                  <input
                    className="editorial-input text-xs h-8 mt-1"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Titre professionnel
                  </label>
                  <input
                    className="editorial-input text-xs h-8 mt-1"
                    placeholder="ex: Élève Ingénieur / Data"
                    value={profile.title}
                    onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Email
                  </label>
                  <input
                    className="editorial-input text-xs h-8 mt-1"
                    placeholder="votre.email@domaine.com"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Téléphone
                  </label>
                  <input
                    className="editorial-input text-xs h-8 mt-1"
                    placeholder="+33 6 ... / +212 6 ..."
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between pt-1">
                  <div className="flex-1 mr-2">
                    <input
                      className="editorial-input text-xs h-8"
                      placeholder="Ville, Pays (ex: Paris, France)"
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    className="editorial-button-primary h-8 px-3 text-xs flex items-center gap-1 shrink-0"
                    onClick={handleSaveProfile}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Enregistrer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Letter Target Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Entreprise Cible
              </label>
              <input
                className="editorial-input mt-1.5 h-9"
                placeholder="ex: Capgemini, L'Oréal..."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Intitulé du Poste
              </label>
              <input
                className="editorial-input mt-1.5 h-9"
                placeholder="ex: Stage PFE - Data Engineer"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
          </div>

          {/* Letter Message Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Contenu de la Lettre
              </label>
              <span className="text-[11px] text-slate-400">
                Variables : [Company], [Position], [MyName]
              </span>
            </div>
            <textarea
              className="editorial-textarea min-h-[170px] text-[13px] leading-relaxed"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--editorial-border)] px-6 py-4 bg-[#f8fafc] sm:flex-row sm:items-center sm:justify-between rounded-b-[20px]">
          <p className="text-xs text-slate-500">
            Format A4 standard français avec en-têtes & signature.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="editorial-button-secondary h-9 px-3.5 text-xs flex items-center gap-1.5 bg-white"
              onClick={handlePreviewPdf}
            >
              <Eye className="h-3.5 w-3.5" />
              Aperçu
            </button>
            <button
              type="button"
              className="editorial-button-primary h-9 px-4 text-xs flex items-center gap-2 shadow-sm"
              onClick={handleDownloadPdf}
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger la Lettre PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
