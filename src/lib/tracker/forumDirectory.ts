import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";
import { createCompany, listCompanies, updateCompany } from "./queries";
import { lookupKnownCompanyLogo } from "./companyDirectory";

export type ForumVisitStatus =
  | "to_visit"
  | "priority"
  | "cv_submitted"
  | "contact_made"
  | "skip";

export interface ForumCompanyEntry {
  id: string;
  category: string;
  companyName: string;
  domain?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  domains: string[];
  rawDomainsText: string;
  tagline?: string | null;
  stand?: string | null;
  status: ForumVisitStatus;
  contactPerson?: string | null;
  notes?: string | null;
  rating?: number;
  topObjective?: ("dev" | "data" | "cloud" | "sap")[];
  updatedAt: string;
}

export const FORUM_STORAGE_KEY = "mailpilot_forum_companies_v2";

export const FORUM_FILTER_PRESETS = [
  { id: "all", label: "Toutes les entreprises", countBadge: null },
  { id: "top_data", label: "🎯 Top DATA / IA (Recommandé)", keywords: ["top_data"] },
  { id: "top_dev", label: "🎯 Top DEV Backend/Fullstack", keywords: ["top_dev"] },
  { id: "top_cloud", label: "🎯 Top CLOUD / DEVOPS", keywords: ["top_cloud"] },
  { id: "top_sap", label: "🎯 Top SAP / ERP", keywords: ["top_sap"] },
  { id: "data", label: "DATA / BI / IA", keywords: ["data", "ia", "bi", "analytics", "rag", "llm", "science", "gouvernance"] },
  { id: "dev", label: "DEV / Logiciel", keywords: ["dev", "java", "jee", "spring", "angular", ".net", "backend", "ingénierie logicielle", "applicative", "embarqué", "api"] },
  { id: "cloud", label: "CLOUD / DEVOPS", keywords: ["cloud", "devops", "devsecops", "infrastructure"] },
  { id: "cyber", label: "CYBER / Sécurité", keywords: ["cyber", "sécurité"] },
  { id: "sap", label: "SAP / ERP / CRM", keywords: ["sap", "erp", "salesforce", "servicenow", "btp"] },
  { id: "telecom", label: "TÉLÉCOMS / IoT", keywords: ["télécoms", "télécom", "réseaux", "iot", "5g"] },
];

export const INITIAL_FORUM_COMPANIES: ForumCompanyEntry[] = [
  // =========================================================================
  // 1. ENTREPRISES IT ET SERVICES NUMÉRIQUES
  // =========================================================================
  {
    id: "forum-inetum",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Inetum",
    domain: "inetum.com",
    logoUrl: "https://logo.clearbit.com/inetum.com",
    website: "https://www.inetum.com",
    domains: ["DEV", "DATA/BI/IA", "CLOUD/DEVOPS", "SAP/ERP", "Salesforce", "ServiceNow"],
    rawDomainsText: "DEV · DATA/BI/IA · CLOUD/DEVOPS · SAP/ERP · Salesforce · ServiceNow",
    tagline: "Inetum",
    stand: "Stand A01",
    status: "priority",
    topObjective: ["dev", "data", "cloud", "sap"],
    notes: "Top recruteur DEV, DATA et CLOUD. Pitcher les projets batch / API et intérêt pour les missions grands comptes.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-sofrecom",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Sofrecom",
    domain: "sofrecom.com",
    logoUrl: "https://logo.clearbit.com/sofrecom.com",
    website: "https://www.sofrecom.com",
    domains: ["DEV", "DATA/IA", "CLOUD/DEVOPS", "Télécoms", "CYBER"],
    rawDomainsText: "DEV · DATA/IA · CLOUD/DEVOPS · Télécoms · CYBER",
    tagline: "Orange Group",
    stand: "Stand A02",
    status: "priority",
    topObjective: ["dev", "data", "cloud"],
    notes: "Filiale d'Orange. Projets internationaux télécoms, data et cloud en Afrique & Moyen-Orient.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-sii",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "SII Group Maroc",
    domain: "sii-group.com",
    logoUrl: "https://logo.clearbit.com/sii-group.com",
    website: "https://sii-group.com",
    domains: ["DEV", "DATA/IA", "Ingénierie logicielle", "Logiciel embarqué", "Télécoms"],
    rawDomainsText: "DEV · DATA/IA · Ingénierie logicielle · Logiciel embarqué · Télécoms",
    tagline: "Groupe SII",
    stand: "Stand A03",
    status: "priority",
    topObjective: ["dev"],
    notes: "Société d'ingénierie tech majeure. Pôle développement logiciel et data pour grands comptes européens.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-skatys",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "SKATYS",
    domain: "skatys.com",
    logoUrl: null,
    website: "https://www.skatys.com",
    domains: ["SAP/ERP", "SAP BTP", "BI/DATA", "Analytics", "IA appliquée aux processus métier"],
    rawDomainsText: "SAP/ERP · SAP BTP · BI/DATA · Analytics · IA appliquée aux processus métier",
    tagline: "Conseil & Intégration Solutions SAP",
    stand: "Stand A04",
    status: "priority",
    topObjective: ["sap"],
    notes: "Leader sur l'intégration SAP et Business Analytics. Très forte valeur ajoutée sur l'IA appliquée aux processus d'entreprise.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-capgemini",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Capgemini",
    domain: "capgemini.com",
    logoUrl: "https://logo.clearbit.com/capgemini.com",
    website: "https://www.capgemini.com",
    domains: ["DEV", "DATA/IA", "CLOUD/DEVOPS", "Ingénierie logicielle", "CYBER"],
    rawDomainsText: "DEV · DATA/IA · CLOUD/DEVOPS · Ingénierie logicielle · CYBER",
    tagline: "Make it real.",
    stand: "Stand B01",
    status: "priority",
    topObjective: ["dev", "data", "cloud", "sap"],
    notes: "Énorme volume de recrutements PFE (Casablanca, Rabat). Pôles Insights & Data et Cloud Infrastructure.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-viseo",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "VISEO",
    domain: "viseo.com",
    logoUrl: "https://logo.clearbit.com/viseo.com",
    website: "https://www.viseo.com",
    domains: ["SAP/ERP", "DEV Java/.NET", "Salesforce", "DATA/BI"],
    rawDomainsText: "SAP/ERP · DEV Java/.NET · Salesforce · DATA/BI",
    tagline: "VISEO Global",
    stand: "Stand B02",
    status: "priority",
    topObjective: ["dev", "sap"],
    notes: "Cabinet de conseil et ESN internationale. Pôles dev backend Java/.NET et intégration ERP/Data.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-s2m",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "S2M",
    domain: "s2m.ma",
    logoUrl: null,
    website: "https://www.s2m.ma",
    domains: ["DEV Java/JEE", "Backend", "Intégration", "Paiement électronique", "Sécurité"],
    rawDomainsText: "DEV Java/JEE · Backend · Intégration · Paiement électronique · Sécurité",
    tagline: "Solutions Monétiques",
    stand: "Stand B03",
    status: "priority",
    topObjective: ["dev"],
    notes: "Pionnier marocain de la monétique et transactions financières sécurisées. Fort besoin en ingénieurs dev backend Java.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-leyton",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Leyton CognitX",
    domain: "leyton.com",
    logoUrl: "https://logo.clearbit.com/leyton.com",
    website: "https://www.leyton.com",
    domains: ["DEV", "DATA Engineering", "Data Science", "IA générative/LLM", "RAG", "DevSecOps"],
    rawDomainsText: "DEV · DATA Engineering · Data Science · IA générative/LLM · RAG · DevSecOps",
    tagline: "Unlock New Potential with AI Solutions",
    stand: "Stand C01",
    status: "priority",
    topObjective: ["data"],
    notes: "Filiale tech et IA de Leyton. Très forte orientation RAG, LLM et Data Science opérationnelle. À cibler en priorité absolue !",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-orange",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Orange Business",
    domain: "orange-business.com",
    logoUrl: "https://logo.clearbit.com/orange-business.com",
    website: "https://www.orange-business.com",
    domains: ["DATA/IA", "CLOUD/DEVOPS", "CYBER", "Réseaux", "IoT", "Intégration numérique"],
    rawDomainsText: "DATA/IA · CLOUD/DEVOPS · CYBER · Réseaux · IoT · Intégration numérique",
    tagline: "Orange Jobs",
    stand: "Stand C02",
    status: "priority",
    topObjective: ["data", "cloud"],
    notes: "Entité B2B d'Orange. Projets cloud souverain, cybersécurité et plateformes big data industrielles.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-afd",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "AFD.TECH — Accenture",
    domain: "afdtech.com",
    logoUrl: null,
    website: "https://www.afdtech.com",
    domains: ["CLOUD/DEVOPS", "DATA", "CYBER", "Réseaux télécoms", "Infrastructure"],
    rawDomainsText: "CLOUD/DEVOPS · DATA · CYBER · Réseaux télécoms · Infrastructure",
    tagline: "your digital team",
    stand: "Stand C03",
    status: "priority",
    topObjective: ["cloud"],
    notes: "Rattachée à Accenture Industry X. Projets d'infrastructures cloud, automatisation et virtualisation télécoms.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-atlas",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Atlas Cloud Services",
    domain: "atlascloudservices.com",
    logoUrl: null,
    website: "https://atlascloudservices.com",
    domains: ["CLOUD", "Infrastructure", "DATA/IA", "Modernisation applicative"],
    rawDomainsText: "CLOUD · Infrastructure · DATA/IA · Modernisation applicative",
    tagline: "Data Center & Cloud",
    stand: "Stand D01",
    status: "priority",
    topObjective: ["cloud"],
    notes: "Opérateur de Data Center certifié Tier III et Tier IV (Benguerir UM6P). Infrastructures cloud souveraines au Maroc.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-deloitte",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Deloitte",
    domain: "deloitte.com",
    logoUrl: "https://logo.clearbit.com/deloitte.com",
    website: "https://www.deloitte.com",
    domains: ["DATA/IA", "CLOUD", "CYBER", "Transformation digitale", "ERP/SAP selon l'équipe"],
    rawDomainsText: "DATA/IA · CLOUD · CYBER · Transformation digitale · ERP/SAP selon l'équipe",
    tagline: "Deloitte Nearshore",
    stand: "Stand D02",
    status: "priority",
    topObjective: ["data", "cloud"],
    notes: "Centre Nearshore à Casablanca. Recrutements importants sur l'IA, la cybersécurité et la gouvernance IT.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-mazars",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Forvis Mazars",
    domain: "forvismazars.com",
    logoUrl: null,
    website: "https://www.forvismazars.com",
    domains: ["DATA/BI", "Gouvernance des données", "CYBER", "Conseil technologique"],
    rawDomainsText: "DATA/BI · Gouvernance des données · CYBER · Conseil technologique",
    tagline: "Audit & Advisory",
    stand: "Stand E01",
    status: "to_visit",
    notes: "Pôle conseil technologique : gouvernance de données, conformité IT et audit cybersécurité.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-grantthornton",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Fidaroc Grant Thornton",
    domain: "grantthornton.ma",
    logoUrl: null,
    website: "https://www.grantthornton.ma",
    domains: ["DATA/BI", "Conseil", "Transformation numérique"],
    rawDomainsText: "DATA/BI · Conseil · Transformation numérique",
    tagline: "Conseil & Audit",
    stand: "Stand E02",
    status: "to_visit",
    notes: "Cabinet de conseil et d'audit. Missions de modélisation financière, BI et transformation digitale.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-netis",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "NETIS",
    domain: "netisgroup.net",
    logoUrl: null,
    website: "https://www.netisgroup.net",
    domains: ["Réseaux", "Télécoms", "Infrastructure"],
    rawDomainsText: "Réseaux · Télécoms · Infrastructure",
    stand: "Stand F01",
    status: "to_visit",
    notes: "Acteur des infrastructures de télécommunications et réseaux en Afrique.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-ericsson",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Ericsson",
    domain: "ericsson.com",
    logoUrl: "https://logo.clearbit.com/ericsson.com",
    website: "https://www.ericsson.com",
    domains: ["Logiciel télécom", "Réseaux 5G", "Cloud télécom", "Automatisation"],
    rawDomainsText: "Logiciel télécom · Réseaux 5G · Cloud télécom · Automatisation",
    stand: "Stand F02",
    status: "to_visit",
    notes: "Géant des télécoms et de la 5G. Ingénierie logicielle pour les réseaux mobiles et le cloud télécom.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-portnet",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "PortNet",
    domain: "portnet.ma",
    logoUrl: null,
    website: "https://www.portnet.ma",
    domains: ["DEV", "API/intégration", "DATA/BI", "Systèmes d'information logistiques"],
    rawDomainsText: "DEV · API/intégration · DATA/BI · Systèmes d'information logistiques",
    stand: "Stand F03",
    status: "to_visit",
    notes: "Guichet unique national du commerce extérieur du Maroc. Forte composante APIs, échange de flux EDI et BI.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-maysync",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "MaySync",
    domain: "maysync.com",
    logoUrl: null,
    website: "https://www.maysync.com",
    domains: ["Conseil", "Management", "Digitalisation"],
    rawDomainsText: "Conseil/management apparent · Spécialités technologiques à confirmer",
    stand: "Stand F04",
    status: "to_visit",
    notes: "Conseil et management. Se renseigner au stand sur leurs opportunités IT / Data.",
    updatedAt: new Date().toISOString(),
  },

  // =========================================================================
  // 2. BANQUES ET ASSURANCES
  // =========================================================================
  {
    id: "forum-attijariwafa",
    category: "2. Banques et assurances",
    companyName: "Attijariwafa bank",
    domain: "attijariwafabank.com",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1c/LogoNew.png",
    website: "https://www.attijariwafabank.com",
    domains: ["DEV", "DATA/BI", "Applications bancaires", "CLOUD", "CYBER"],
    rawDomainsText: "DEV · DATA/BI · Applications bancaires · CLOUD · CYBER",
    stand: "Stand B-Banque 01",
    status: "priority",
    topObjective: ["dev", "data"],
    notes: "Plus grand groupe bancaire. Équipes internes data science (scoring crédit, détection de fraude) et dev core-banking.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-bcp",
    category: "2. Banques et assurances",
    companyName: "Banque Populaire / Crédit Populaire du Maroc",
    domain: "groupebanquepopulaire.ma",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Banque_Populaire_du_Maroc_Logo.svg",
    website: "https://groupebanquepopulaire.ma",
    domains: ["DEV", "DATA/BI", "Systèmes bancaires", "CYBER"],
    rawDomainsText: "DEV · DATA/BI · Systèmes bancaires · CYBER",
    stand: "Stand B-Banque 02",
    status: "priority",
    topObjective: ["dev", "data"],
    notes: "Gros besoins en digitalisation des parcours clients, data warehouses et cybersécurité bancaire.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-cdm",
    category: "2. Banques et assurances",
    companyName: "Crédit du Maroc (CDM)",
    domain: "creditdumaroc.ma",
    logoUrl: null,
    website: "https://www.creditdumaroc.ma",
    domains: ["DEV", "DATA/BI", "Applications bancaires", "Intégration"],
    rawDomainsText: "DEV · DATA/BI · Applications bancaires · Intégration",
    stand: "Stand B-Banque 03",
    status: "to_visit",
    notes: "Filiale du groupe Holmarcom. Chantiers de modernisation du système d'information et intégration applicative.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-cfgbank",
    category: "2. Banques et assurances",
    companyName: "CFG Bank",
    domain: "cfgbank.com",
    logoUrl: null,
    website: "https://www.cfgbank.com",
    domains: ["DEV", "DATA/BI", "Systèmes d'information financiers"],
    rawDomainsText: "DEV · DATA/BI · Systèmes d'information financiers",
    stand: "Stand B-Banque 04",
    status: "to_visit",
    notes: "Banque digitale et d'affaires reconnue pour son application mobile fluide et ses outils boursiers.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-cam",
    category: "2. Banques et assurances",
    companyName: "Crédit Agricole du Maroc",
    domain: "creditagricole.ma",
    logoUrl: null,
    website: "https://www.creditagricole.ma",
    domains: ["DEV Java/Spring Boot/Angular", "DATA Engineering", "BI", "Intégration"],
    rawDomainsText: "DEV Java/Spring Boot/Angular · DATA Engineering · BI · Intégration",
    tagline: "Un engagement durable",
    stand: "Stand B-Banque 05",
    status: "priority",
    topObjective: ["dev", "data"],
    notes: "Fort besoin exprimé en DEV Java/Spring Boot/Angular et DATA Engineering. À voir absolument !",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-bkam",
    category: "2. Banques et assurances",
    companyName: "Bank Al-Maghrib",
    domain: "bkam.ma",
    logoUrl: null,
    website: "https://www.bkam.ma",
    domains: ["DATA/Analytics", "Systèmes financiers", "CYBER", "Informatique interne"],
    rawDomainsText: "DATA/Analytics · Systèmes financiers · CYBER · Informatique interne",
    stand: "Stand B-Banque 06",
    status: "priority",
    topObjective: ["data"],
    notes: "Banque Centrale du Maroc. Projets macroéconomiques, analyses prédictives, sécurité financière et SI souverain.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-wafa-assurance",
    category: "2. Banques et assurances",
    companyName: "Wafa Assurance",
    domain: "wafaassurance.ma",
    logoUrl: null,
    website: "https://www.wafaassurance.ma",
    domains: ["DATA/BI", "Applications d'assurance", "Digitalisation"],
    rawDomainsText: "DATA/BI · Applications d'assurance · Digitalisation",
    stand: "Stand B-Assur 01",
    status: "to_visit",
    notes: "Compagnie d'assurance leader au Maroc. Projets de tarification actuarielle prédictive et dématérialisation.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-sanlam",
    category: "2. Banques et assurances",
    companyName: "Sanlam Allianz Maroc",
    domain: "sanlam.ma",
    logoUrl: null,
    website: "https://www.sanlam.ma",
    domains: ["DATA/BI", "Systèmes d'assurance", "Applications métier"],
    rawDomainsText: "DATA/BI · Systèmes d'assurance · Applications métier",
    stand: "Stand B-Assur 02",
    status: "to_visit",
    notes: "Alliance Sanlam & Allianz. Plateformes digitales d'assurance et analyse de données clients.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-cimr",
    category: "2. Banques et assurances",
    companyName: "CIMR",
    domain: "cimr.ma",
    logoUrl: null,
    website: "https://www.cimr.ma",
    domains: ["Applications métier", "DATA/BI", "Systèmes de gestion"],
    rawDomainsText: "Applications métier · DATA/BI · Systèmes de gestion",
    stand: "Stand B-Assur 03",
    status: "to_visit",
    notes: "Caisse Interprofessionnelle Marocaine de Retraite. Gestion de données de masse et portails usagers.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-maroclear",
    category: "2. Banques et assurances",
    companyName: "Maroclear",
    domain: "maroclear.com",
    logoUrl: null,
    website: "https://www.maroclear.com",
    domains: ["Systèmes financiers", "Applications transactionnelles", "Bases de données", "CYBER"],
    rawDomainsText: "Systèmes financiers · Applications transactionnelles · Bases de données · CYBER",
    stand: "Stand B-Finance 01",
    status: "to_visit",
    notes: "Dépositaire Central des valeurs mobilières au Maroc. Systèmes transactionnels critiques à haute sécurité.",
    updatedAt: new Date().toISOString(),
  },

  // =========================================================================
  // 3. TÉLÉCOMMUNICATIONS, INDUSTRIE ET AUTRES ORGANISATIONS
  // =========================================================================
  {
    id: "forum-inwi",
    category: "3. Télécommunications, industrie et autres organisations",
    companyName: "inwi",
    domain: "inwi.ma",
    logoUrl: "https://logo.clearbit.com/inwi.ma",
    website: "https://www.inwi.ma",
    domains: ["DATA", "Digital", "Télécoms", "CLOUD", "CYBER"],
    rawDomainsText: "DATA · Digital · Télécoms · CLOUD · CYBER",
    tagline: "inwi",
    stand: "Stand T01",
    status: "priority",
    topObjective: ["data", "cloud"],
    notes: "Opérateur télécoms et cloud. Data centers et solutions entreprises (inwi Business). Recrute en Data et Cloud.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-orange-tel",
    category: "3. Télécommunications, industrie et autres organisations",
    companyName: "Orange",
    domain: "orange.ma",
    logoUrl: "https://logo.clearbit.com/orange.ma",
    website: "https://www.orange.ma",
    domains: ["Télécoms", "Réseaux", "CLOUD", "DATA/IA"],
    rawDomainsText: "Télécoms · Réseaux · CLOUD · DATA/IA",
    stand: "Stand T02",
    status: "priority",
    topObjective: ["data", "cloud"],
    notes: "Opérateur grand public et entreprise. Laboratoires d'innovation digitale, IA et plateformes 5G.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-maroctelecom",
    category: "3. Télécommunications, industrie et autres organisations",
    companyName: "Maroc Telecom",
    domain: "iam.ma",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Maroc_Telecom_logo.png",
    website: "https://www.iam.ma",
    domains: ["Télécoms", "Réseaux", "CLOUD", "CYBER", "Systèmes d'information"],
    rawDomainsText: "Télécoms · Réseaux · CLOUD · CYBER · Systèmes d'information",
    stand: "Stand T03",
    status: "priority",
    notes: "Opérateur historique national. Énormes infrastructures réseau, centres serveurs et SI de facturation.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-ocp",
    category: "3. Télécommunications, industrie et autres organisations",
    companyName: "OCP Group",
    domain: "ocpgroup.ma",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/58/Logo_Ocp.jpg",
    website: "https://www.ocpgroup.ma",
    domains: ["DATA/IA", "Automatisation industrielle", "Logiciels", "Optimisation par IA"],
    rawDomainsText: "DATA/IA · Automatisation industrielle · Logiciels · Optimisation par IA",
    tagline: "Groupe OCP",
    stand: "Stand I01",
    status: "priority",
    topObjective: ["data"],
    notes: "Leader mondial des phosphates. Très gros investissements dans l'IA industrielle, les jumeaux numériques et l'optimisation des procédés.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-onda",
    category: "3. Télécommunications, industrie et autres organisations",
    companyName: "ONDA — Aéroports du Maroc",
    domain: "onda.ma",
    logoUrl: null,
    website: "https://www.onda.ma",
    domains: ["Systèmes aéroportuaires", "Réseaux", "Applications métier", "DATA"],
    rawDomainsText: "Systèmes aéroportuaires · Réseaux · Applications métier · DATA",
    stand: "Stand I02",
    status: "to_visit",
    notes: "Office National Des Aéroports. Systèmes d'information aéroportuaires, guidage et gestion des passagers.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-labelvie",
    category: "3. Télécommunications, industrie et autres organisations",
    companyName: "LabelVie Groupe",
    domain: "labelvie.ma",
    logoUrl: null,
    website: "https://www.labelvie.ma",
    domains: ["DATA/BI", "Applications métier", "Digitalisation du commerce", "ERP selon les postes"],
    rawDomainsText: "DATA/BI · Applications métier · Digitalisation du commerce · ERP selon les postes",
    stand: "Stand I03",
    status: "to_visit",
    notes: "Leader de la grande distribution au Maroc (Carrefour, Atacadao). Analyse de panier client, supply chain et BI.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-valeo",
    category: "3. Télécommunications, industrie et autres organisations",
    companyName: "Valeo",
    domain: "valeo.com",
    logoUrl: "https://logo.clearbit.com/valeo.com",
    website: "https://www.valeo.com",
    domains: ["Logiciel embarqué", "Ingénierie logicielle", "Systèmes automobiles", "Automatisation"],
    rawDomainsText: "Logiciel embarqué · Ingénierie logicielle · Systèmes automobiles · Automatisation",
    stand: "Stand I04",
    status: "priority",
    topObjective: ["dev"],
    notes: "Équipementier automobile mondial (centre R&D et usines à Tanger). Logiciel embarqué C/C++, ADAS et connectivité véhicule.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-mhi",
    category: "3. Télécommunications, industrie et autres organisations",
    companyName: "MHI Morocco",
    domain: "mhi.com",
    logoUrl: null,
    website: "https://www.mhi.com",
    domains: ["Industrie", "Ingénierie", "Systèmes techniques"],
    rawDomainsText: "Industrie/ingénierie à confirmer",
    stand: "Stand I05",
    status: "to_visit",
    notes: "Mitsubishi Heavy Industries. Se renseigner au stand sur leurs opportunités techniques et ingénierie.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-adm",
    category: "3. Télécommunications, industrie et autres organisations",
    companyName: "Autoroutes du Maroc",
    domain: "adm.co.ma",
    logoUrl: null,
    website: "https://www.adm.co.ma",
    domains: ["Systèmes d'information", "Données de trafic", "Applications opérationnelles"],
    rawDomainsText: "Systèmes d'information · Données de trafic · Applications opérationnelles",
    stand: "Stand I06",
    status: "to_visit",
    notes: "Gestion autoroutière et télépéage (Jawaz). Collecte et analyse des données de flux routiers.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-sin",
    category: "3. Télécommunications, industrie et autres organisations",
    companyName: "S-IN Groupe",
    domain: null,
    logoUrl: null,
    website: null,
    domains: ["Services", "Ingénierie"],
    rawDomainsText: "Spécialité technologique non confirmée sur l'affiche",
    stand: "Stand I07",
    status: "to_visit",
    notes: "À clarifier directement au stand lors du forum.",
    updatedAt: new Date().toISOString(),
  },
];

export function loadForumCompanies(): ForumCompanyEntry[] {
  if (typeof window === "undefined") return INITIAL_FORUM_COMPANIES;
  try {
    const raw = localStorage.getItem(FORUM_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(INITIAL_FORUM_COMPANIES));
      return INITIAL_FORUM_COMPANIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 25) {
      return parsed;
    }
    // Upgrade if older smaller list was present
    localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(INITIAL_FORUM_COMPANIES));
    return INITIAL_FORUM_COMPANIES;
  } catch (err) {
    console.error("Failed to load forum companies from storage:", err);
    return INITIAL_FORUM_COMPANIES;
  }
}

export function saveForumCompanies(entries: ForumCompanyEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error("Failed to save forum companies to storage:", err);
  }
}

export function resetForumCompaniesToDefault(): ForumCompanyEntry[] {
  if (typeof window !== "undefined") {
    localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(INITIAL_FORUM_COMPANIES));
  }
  return INITIAL_FORUM_COMPANIES;
}

/**
 * Intelligent parser that accepts raw text or copied tables (such as from PDF, Word, or Markdown)
 */
export function parseRawForumText(
  text: string,
  defaultCategory = "1. Entreprises IT et sociétés de services numériques"
): ForumCompanyEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ForumCompanyEntry[] = [];
  let currentCategory = defaultCategory;

  for (const line of lines) {
    if (/^(\d+\.|\#{1,3}\s*\d*|[A-Z\s]{4,}:)/i.test(line) && !line.includes("·") && !line.includes("\t")) {
      currentCategory = line.replace(/^[#\s]+/, "");
      continue;
    }

    let companyName = "";
    let domainsText = "";

    if (line.includes("\t")) {
      const parts = line.split("\t").map((p) => p.trim()).filter(Boolean);
      companyName = parts[0] || "";
      domainsText = parts.slice(1).join(" · ");
    } else if (line.includes(":") && !line.toLowerCase().startsWith("http")) {
      const idx = line.indexOf(":");
      companyName = line.slice(0, idx).trim();
      domainsText = line.slice(idx + 1).trim();
    } else if (line.includes(" - ")) {
      const idx = line.indexOf(" - ");
      companyName = line.slice(0, idx).trim();
      domainsText = line.slice(idx + 3).trim();
    } else {
      const words = line.split(/\s+/);
      companyName = words[0] || "";
      domainsText = words.slice(1).join(" ");
    }

    if (!companyName) continue;

    const domains = domainsText
      .split(/[·|,;]/)
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const logoUrl = lookupKnownCompanyLogo(companyName);
    const domain = `${slug}.com`;

    results.push({
      id: `forum-${slug}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: currentCategory,
      companyName,
      domain,
      logoUrl: logoUrl || null,
      website: `https://www.${domain}`,
      domains: domains.length > 0 ? domains : [domainsText],
      rawDomainsText: domainsText,
      status: "to_visit",
      stand: "",
      notes: "",
      updatedAt: new Date().toISOString(),
    });
  }

  return results;
}

/**
 * Synchronize forum companies with Supabase `companies` table.
 */
export async function syncForumCompaniesToSupabase(
  entries: ForumCompanyEntry[]
): Promise<{ created: number; updated: number }> {
  const existingCompanies = await listCompanies();
  const existingByName = new Map(
    existingCompanies.map((c) => [c.name.trim().toLowerCase(), c])
  );

  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    const key = entry.companyName.trim().toLowerCase();
    const existing = existingByName.get(key);

    const description = `[Forum Focus: ${entry.rawDomainsText}] ${entry.notes || ""}`.trim();
    const location = entry.stand ? `Forum: ${entry.stand}` : null;

    if (existing) {
      await updateCompany(existing.id, {
        description: description || existing.description,
        sector: entry.category,
        location: location || existing.location,
        domain: entry.domain || existing.domain,
        notes: entry.notes || existing.notes,
      });
      updated++;
    } else {
      await createCompany({
        name: entry.companyName,
        domain: entry.domain || null,
        logo_url: entry.logoUrl || null,
        website: entry.website || null,
        sector: entry.category,
        description,
        location,
        notes: entry.notes || null,
      });
      created++;
    }
  }

  return { created, updated };
}
