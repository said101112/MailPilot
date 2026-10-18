"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Mail,
  Network,
  Send,
  ShieldCheck,
  Upload,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import InteractiveDashboardCharts from "@/components/dashboard/InteractiveDashboardCharts";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import UpdatePasswordModal from "@/components/profile/UpdatePasswordModal";
import { KNOWN_COMPANIES } from "@/lib/tracker/companyDirectory";

interface ActivityItem {
  id: string;
  company: string | null;
  position: string | null;
  email: string;
  status: string;
  created_at: string;
}

const platformLabels = [
  "Candidature Directe (Email)",
  "Portail Recruteur",
  "LinkedIn RH",
  "Site Carrière",
  "Workflow n8n",
];

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string>("said.nichan14@gmail.com");
  const [applicationCount, setApplicationCount] = useState(0);
  const [companyCount, setCompanyCount] = useState(KNOWN_COMPANIES.length);
  const [successRate, setSuccessRate] = useState(100);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [allApplications, setAllApplications] = useState<ActivityItem[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    async function fetchUserData() {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    }

    async function fetchDashboardData() {
      const [recentResponse, statusResponse, allAppsResponse, companiesResponse] =
        await Promise.all([
          supabase
            .from("applications")
            .select("id, company, position, email, status, created_at", {
              count: "exact",
            })
            .order("created_at", { ascending: false })
            .limit(8),
          supabase.from("applications").select("status"),
          supabase
            .from("applications")
            .select("id, company, position, email, status, created_at")
            .order("created_at", { ascending: false })
            .limit(300),
          supabase
            .from("companies")
            .select("id", { count: "exact", head: true }),
        ]);

      if (!recentResponse.error) {
        setApplicationCount(recentResponse.count ?? 0);
        if (recentResponse.data && recentResponse.data.length > 0) {
          setRecentActivity(recentResponse.data);
        }
      }

      if (!companiesResponse.error && companiesResponse.count) {
        setCompanyCount(Math.max(companiesResponse.count, KNOWN_COMPANIES.length));
      }

      if (!allAppsResponse.error && allAppsResponse.data) {
        setAllApplications(allAppsResponse.data);
      }

      if (
        !statusResponse.error &&
        statusResponse.data &&
        statusResponse.data.length > 0
      ) {
        const successful = statusResponse.data.filter(
          (item) => item.status === "success",
        ).length;
        setSuccessRate(
          Number(((successful / statusResponse.data.length) * 100).toFixed(1)),
        );

        const pending = statusResponse.data.filter(
          (item) => item.status === "pending",
        ).length;
        const processing = statusResponse.data.filter(
          (item) => item.status === "processing" || item.status === "sending",
        ).length;
        const errorCount = statusResponse.data.filter(
          (item) => item.status === "error" || item.status === "failed",
        ).length;

        setQueueCount(pending + processing + errorCount);
        setProcessingCount(processing);
      }
    }

    void fetchUserData();
    void fetchDashboardData();
  }, []);

  const greeting = useMemo(() => getGreeting(), []);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-7 sm:px-8">
      {/* 1. Header Greeting with Executive Context */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              {greeting}, M. Said Nichan
            </h1>
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-[#ff5722]">
              PRO
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 max-w-2xl">
            Plateforme de gestion de candidatures, automatisation des prises de contact RH et suivi des opportunités IT &amp; Engineering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="editorial-button-secondary h-8 px-3 text-xs inline-flex items-center gap-1.5"
            title="Mettre à jour le mot de passe Supabase"
          >
            <KeyRound className="h-3.5 w-3.5 text-[#ff5722]" />
            <span>Sécurité &amp; Mot de passe</span>
          </button>
          <Link
            className="editorial-button-secondary h-8 px-3 text-xs"
            href="/history"
          >
            Historique complet
          </Link>
          <Link
            className="editorial-button-primary h-8 px-3.5 text-xs inline-flex items-center gap-1.5"
            href="/apply"
          >
            <Send className="h-3 w-3" />
            <span>Postuler</span>
          </Link>
        </div>
      </div>

      {/* 2. Unified Metric Strip */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {/* Metric 1: Total Applications */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Mail className="h-3.5 w-3.5 text-[#ff5722]" />
              <span>Candidatures envoyées</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                {applicationCount}
              </span>
              <span className="text-xs text-gray-400">Total actifs</span>
            </div>
          </div>

          {/* Metric 2: Delivery Success Rate */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Taux de délivrabilité</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                {successRate}%
              </span>
              <span className="text-xs font-medium text-emerald-600">
                Envois sains (SPF/DKIM)
              </span>
            </div>
          </div>

          {/* Metric 3: Companies in Directory */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              <span>Entreprises répertoriées</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                {companyCount}+
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                Maroc • KSA • France
              </span>
            </div>
          </div>

          {/* Metric 4: Live Queue */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Clock className="h-3.5 w-3.5 text-purple-600" />
              <span>File de traitement</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                {queueCount} En attente
              </span>
              <span className="text-xs text-gray-400">
                {processingCount} en cours
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5. Interactive Statistics & Graphs (Timeline, Delivery Health Donut, Channels) */}
      <InteractiveDashboardCharts
        applications={allApplications}
        totalCount={applicationCount}
        successRate={successRate}
      />

      {/* 3. Middle Section: Real Project Data (Recent Applications & Quick Actions) */}
      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Real Recent Applications Table (2 Columns) */}
        <div className="rounded-xl border border-gray-200 bg-white lg:col-span-2 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-gray-50/50">
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Candidatures Récentes
              </h2>
              <p className="text-xs text-gray-500">
                Dernières prises de contact transmises aux entreprises cibles et recruteurs.
              </p>
            </div>
            <Link
              className="text-xs font-semibold text-[#ff5722] hover:text-[#e04822] transition"
              href="/history"
            >
              Voir tout l&apos;historique &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-semibold text-gray-500">
                  <th className="px-5 py-3">Entreprise &amp; Contact</th>
                  <th className="px-4 py-3">Date &amp; Heure</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-5 py-3">Canal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-xs text-gray-400"
                    >
                      Aucune candidature enregistrée pour l&apos;instant. Utilisez le bouton &quot;Postuler&quot; pour démarrer.
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-gray-50/80"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <CompanyLogo
                            name={item.company || "Entreprise"}
                            className="h-8 w-8 text-[10px]"
                          />
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">
                              {item.company || "Candidature RH"}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(item.created_at)} &bull; {formatTime(item.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                            item.status === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : item.status === "processing" || item.status === "sending"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {item.status === "success"
                            ? "Délivré"
                            : item.status === "failed" || item.status === "error"
                              ? "Échec"
                              : item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {platformLabels[idx % platformLabels.length]}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Quick Actions & Pipeline Health (1 Column) */}
        <div className="flex flex-col gap-5">
          {/* Quick Actions Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-gray-900">
              Actions Rapides
            </h2>
            <p className="text-xs text-gray-500">
              Démarrez une nouvelle prise de contact ou gérez vos flux.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
                href="/apply"
              >
                <div className="flex items-center gap-2.5">
                  <Send className="h-4 w-4 text-[#ff5722]" />
                  <span>Nouvelle Candidature Directe</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" />
              </Link>

              <Link
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
                href="/upload"
              >
                <div className="flex items-center gap-2.5">
                  <Upload className="h-4 w-4 text-emerald-600" />
                  <span>Import Massif (CSV)</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" />
              </Link>

              <Link
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
                href="/tracker/companies"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span>Annuaire des Entreprises</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" />
              </Link>

              <Link
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
                href="/templates"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <span>Modèles de Messages</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" />
              </Link>
            </div>
          </div>

          {/* System Pipeline Status */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Santé de l&apos;Automatisation
            </span>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>Moteur de Webhook n8n</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Opérationnel
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                  <Database className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Base de Données Supabase</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Connectée
                </span>
              </div>
            </div>

            <Link
              href="/connections"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <span>Vérifier les passerelles</span>
              <ArrowUpRight className="h-3 w-3 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Recruitment Tools */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-gray-900">
          Outils de Prospection &amp; Candidature RH
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Tool 1 */}
          <Link
            href="/apply"
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-[#ff5722]/50 hover:shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 group-hover:text-[#ff5722] transition">
              <Mail className="h-4 w-4 text-[#ff5722]" />
              <span>Candidature Directe</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Envois individualisés et personnalisés avec CV PDF joint, expédiés via SMTP sécurisé.
            </p>
          </Link>

          {/* Tool 2 */}
          <Link
            href="/upload"
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-emerald-500/50 hover:shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 group-hover:text-emerald-600 transition">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Import Massif CSV</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Programmez des vagues de candidatures avec temporisation anti-spam et contrôle de délivrabilité.
            </p>
          </Link>

          {/* Tool 3 */}
          <Link
            href="/tracker/applications"
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-blue-500/50 hover:shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 group-hover:text-blue-600 transition">
              <Briefcase className="h-4 w-4 text-blue-600" />
              <span>Suivi &amp; Entretiens</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Tableau de bord de suivi par statut (Envoyé, Relancé, Entretien, Offre) avec dates clés.
            </p>
          </Link>

          {/* Tool 4 */}
          <Link
            href="/templates"
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-amber-500/50 hover:shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 group-hover:text-amber-600 transition">
              <FileText className="h-4 w-4 text-amber-500" />
              <span>Modèles Dynamiques</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Variables automatiques [Entreprise], [Poste], et [MonNom] pour adapter chaque email en 1 seconde.
            </p>
          </Link>
        </div>
      </div>

      {/* Password Update Modal */}
      <UpdatePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        userEmail={userEmail}
      />
    </div>
  );
}
