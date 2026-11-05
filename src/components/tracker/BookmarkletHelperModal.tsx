"use client";

import { useState } from "react";
import { Bookmark, Check, Copy, ExternalLink, HelpCircle, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

interface BookmarkletHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookmarkletHelperModal({
  isOpen,
  onClose,
}: BookmarkletHelperModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // The bookmarklet code that captures current page title and url
  const bookmarkletCode = `javascript:(function(){
    var name = document.title.split(/[-–|]/)[0].trim();
    var url = window.location.href;
    var target = prompt('Ajouter cette entreprise à MailPilot Checklist :', name);
    if(target){
      var appUrl = window.location.origin.includes('localhost') ? 'http://localhost:3000' : 'https://said-nichan-three.vercel.app';
      window.open(appUrl + '/tracker/checklist?addName=' + encodeURIComponent(target) + '&addUrl=' + encodeURIComponent(url), '_blank');
    }
  })();`;

  const copyBookmarklet = () => {
    void navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    toast.success("Code du Bookmarklet copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-gray-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Bookmark className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Bouton Rapide Navigateur (Bookmarklet 100% Gratuit)
              </h2>
              <p className="text-xs text-gray-500">
                Ajoutez une entreprise en 1 clic directement quand vous êtes sur LinkedIn.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
          <p>
            Ce petit marque-page gratuit s&apos;installe dans vos favoris Chrome, Edge ou Brave. Quand vous visitez la page d&apos;une entreprise sur LinkedIn :
          </p>

          <ol className="list-decimal pl-4 space-y-1.5 font-medium text-gray-800">
            <li>
              Glissez le bouton orange ci-dessous directement dans votre <strong>barre de favoris</strong> (Ctrl + Shift + B pour l&apos;afficher).
            </li>
            <li>
              Sur LinkedIn, ouvrez la page de l&apos;entreprise (ex: <em>Docaposte Maroc</em>).
            </li>
            <li>
              Cliquez sur votre favori <strong>« ➕ Check Entreprise »</strong> : il l&apos;enregistre directement dans votre checklist !
            </li>
          </ol>

          {/* Draggable button */}
          <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 text-center space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800 block">
              Glissez ce bouton dans vos favoris :
            </span>
            <a
              href={bookmarkletCode}
              onClick={(e) => {
                e.preventDefault();
                toast.info("Glissez ce bouton vers votre barre de favoris en haut du navigateur !");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5722] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#f4511e] cursor-grab active:cursor-grabbing select-none"
            >
              <Bookmark className="h-4 w-4" />
              <span>➕ Check Entreprise</span>
            </a>
          </div>

          {/* Manual Copy option */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-gray-500 text-[11px]">
              Ou copiez le code manuellement :
            </span>
            <button
              type="button"
              onClick={copyBookmarklet}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff5722] hover:underline cursor-pointer"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copié !" : "Copier le code JavaScript"}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-900 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-gray-800 transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

