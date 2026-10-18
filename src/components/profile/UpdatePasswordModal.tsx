"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface UpdatePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function UpdatePasswordModal({
  isOpen,
  onClose,
  userEmail,
}: UpdatePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Validation rules
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isMatch = password.length > 0 && password === confirmPassword;
  const isStrong = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!hasMinLength) {
      setErrorMsg("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg(
          "Mot de passe mis à jour avec succès dans Supabase ! Vos futures connexions utiliseront ce mot de passe fort.",
        );
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#ff5722]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Sécurité du compte Supabase
              </h2>
              <p className="text-xs text-gray-500">
                Mettez à jour votre mot de passe pour sécuriser votre compte
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {userEmail && (
            <div className="rounded-lg bg-gray-50 border border-gray-200/80 px-3.5 py-2.5 text-xs flex items-center justify-between">
              <span className="text-gray-500">Utilisateur connecté :</span>
              <span className="font-semibold text-gray-800">{userEmail}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900">Succès !</p>
                <p className="mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Impossible de mettre à jour :</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nouveau mot de passe fort
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 caractères, majuscule, chiffre..."
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 pr-10 text-xs text-gray-900 focus:border-[#ff5722] focus:outline-hidden focus:ring-1 focus:ring-[#ff5722]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-[#ff5722] focus:outline-hidden focus:ring-1 focus:ring-[#ff5722]"
                required
              />
            </div>

            {/* Password Criteria Checklist */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 space-y-1.5 text-[11px]">
              <p className="font-semibold text-gray-600 mb-1">Exigences de robustesse :</p>
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                  <Check className={`h-3 w-3 ${hasMinLength ? "stroke-[3]" : "opacity-30"}`} />
                  <span>Au moins 8 caractères</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                  <Check className={`h-3 w-3 ${hasUppercase ? "stroke-[3]" : "opacity-30"}`} />
                  <span>Une majuscule (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                  <Check className={`h-3 w-3 ${hasNumber ? "stroke-[3]" : "opacity-30"}`} />
                  <span>Un chiffre (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                  <Check className={`h-3 w-3 ${hasSpecial ? "stroke-[3]" : "opacity-30"}`} />
                  <span>Un symbole (@, #, !...)</span>
                </div>
              </div>
              {confirmPassword.length > 0 && (
                <div className={`pt-1 flex items-center gap-1.5 ${isMatch ? "text-emerald-600 font-medium" : "text-rose-600"}`}>
                  <Check className="h-3 w-3" />
                  <span>{isMatch ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas"}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !hasMinLength || !isMatch}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#ff5722] hover:bg-[#e04822] text-white py-2.5 text-xs font-semibold shadow-xs disabled:opacity-50 transition"
            >
              {loading ? (
                <span>Mise à jour en cours...</span>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Mettre à jour mon mot de passe</span>
                </>
              )}
            </button>
          </form>

          {/* Option 2: Supabase Dashboard Guidance */}
          <div className="border-t border-gray-100 pt-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  Méthode alternative via Supabase Dashboard
                </span>
                <a
                  href="https://supabase.com/dashboard/project/lulrhipthiagtaarigmf/auth/users"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  Ouvrir Supabase
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-blue-800/80 text-[11.5px] leading-relaxed">
                Vous pouvez également réinitialiser votre mot de passe directement dans votre console Supabase :
                rendez-vous dans <strong>Authentication → Users</strong>, cliquez sur les <code>...</code> à côté de votre adresse email, puis choisissez <strong>&quot;Update user&quot;</strong> ou <strong>&quot;Send password reset&quot;</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
