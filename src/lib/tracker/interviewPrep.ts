export interface PitchData {
  title: string;
  hook: string;
  background: string;
  keyProjects: string;
  whyThisCompany: string;
  conclusion: string;
}

export interface QuestionAnswerItem {
  id: string;
  category: "classic" | "technical" | "behavioral" | "difficult";
  question: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  fullAnswer?: string;
  keyTip?: string;
}

export interface StrategicQuestionItem {
  id: string;
  category: "architecture" | "team_culture" | "business_vision" | "success_metrics";
  question: string;
  impactReason: string;
  tags: string[];
  isFavorite?: boolean;
}

export interface CompanyPrepItem {
  id: string;
  companyName: string;
  roleTitle: string;
  strongPoints: string[];
  keyChallenges: string;
  tailoredQuestions: string[];
  liveNotes: string;
  updatedAt: string;
}

export interface InterviewPrepState {
  pitch: PitchData;
  qaList: QuestionAnswerItem[];
  strategicQuestions: StrategicQuestionItem[];
  companySheets: CompanyPrepItem[];
}

export const PREP_STORAGE_KEY = "mailpilot_interview_prep_v1";

export const DEFAULT_PREP_DATA: InterviewPrepState = {
  pitch: {
    title: "Pitch 2 Minutes Chrono (Élève Ingénieur Data / IA / Tech)",
    hook: "Bonjour, je m'appelle [Mon Nom], élève ingénieur en dernière année passionné par la conception de systèmes de données fiables et de solutions d'Intelligence Artificielle à fort impact.",
    background: "Durant mon parcours, j'ai développé une solide expertise en modélisation (Python, PyTorch, Scikit-Learn) ainsi qu'en ingénierie logicielle et pipelines de données (SQL, Docker, APIs REST, FastApi).",
    keyProjects: "Récemment, j'ai notamment conçu [Nom de votre projet phare] : une application de [description du projet] capable de [résultat concret, ex: réduire le temps de traitement de 40% ou classifier des données avec 92% de précision].",
    whyThisCompany: "Ce qui m'attire particulièrement chez vous, c'est [citer un défi technique ou un produit de la boîte], et je souhaite consacrer mon stage PFE à apporter des solutions concrètes à vos enjeux de données.",
    conclusion: "Mon objectif est d'être immédiatement opérationnel dans votre équipe et de transformer mes compétences théoriques en valeur mesurable pour vos utilisateurs."
  },
  qaList: [
    {
      id: "qa-1",
      category: "classic",
      question: "Parlez-moi de vous et de votre parcours.",
      fullAnswer: "Utilisez la structure : 1) Qui je suis (élève ingénieur), 2) Ce que j'ai réalisé (2 projets concrets marquants), 3) Pourquoi cette opportunité aujourd'hui. Gardez un ton énergique et concis.",
      keyTip: "Ne récitez pas votre CV ligne par ligne. Focalisez-vous sur ce qui fait le lien avec le poste convoité."
    },
    {
      id: "qa-2",
      category: "technical",
      question: "Racontez-moi un défi technique complexe que vous avez surmonté.",
      situation: "Lors de la création d'un pipeline d'extraction et de prédiction sur un gros volume de données...",
      task: "Les requêtes mettaient plus de 45 secondes et saturaient la mémoire du serveur.",
      action: "J'ai profilé le code, implémenté du traitement par batch (chunks), mis en cache Redis les requêtes récurrentes et optimisé les jointures SQL avec des index adaptés.",
      result: "Temps de réponse divisé par 6 (tombé à 7 secondes) et consommation mémoire réduite de 65%.",
      keyTip: "La méthode STAR (Situation, Tâche, Action, Résultat) impressionne toujours par sa clarté."
    },
    {
      id: "qa-3",
      category: "difficult",
      question: "Quelles sont vos prétentions d'indemnité / salaire pour ce stage ou poste ?",
      fullAnswer: "« Pour ce stage PFE de fin d'études, mes attentes se situent dans la fourchette standard du marché pour un profil ingénieur, entre [Ex: 1200€ et 1500€ / mois] selon les avantages (tickets resto, transports, télétravail). Ma priorité absolue reste la qualité technique du projet et les opportunités d'embauche post-PFE. »",
      keyTip: "Donnez une fourchette réaliste et replacez toujours la valeur du projet au centre."
    },
    {
      id: "qa-4",
      category: "behavioral",
      question: "Comment réagissez-vous face à une divergence d'avis technique avec un collègue ?",
      situation: "Lors d'un projet d'équipe, nous hésitions entre deux architectures pour la base de données.",
      task: "Éviter les blocages et choisir la solution la plus pérenne sans froisser personne.",
      action: "J'ai proposé de sortir du débat d'opinions : nous avons posé ensemble une matrice comparative (temps de dev, scalabilité, coût) et réalisé un mini proof-of-concept de 2h sur chaque option.",
      result: "Les chiffres ont tranché objectivement, l'équipe a validé la décision à l'unanimité.",
      keyTip: "Montrez que vous privilégiez les données objectives et l'esprit d'équipe plutôt que l'ego."
    }
  ],
  strategicQuestions: [
    {
      id: "sq-1",
      category: "architecture",
      question: "Quelle est la plus grande dette technique de votre pipeline de données ou codebase actuel ?",
      impactReason: "Prouve que vous avez une vision d'ingénieur mature : vous savez que le code parfait n'existe pas et vous voulez aider à réparer ce qui coince.",
      tags: ["Tech", "Architecture", "Engineering"]
    },
    {
      id: "sq-2",
      category: "success_metrics",
      question: "Quels seront les indicateurs précis qui vous feront dire que ce stage ou recrutement est un succès total à 6 mois ?",
      impactReason: "Montre que vous êtes orienté résultats mesurables et que vous voulez dépasser les attentes fixées.",
      tags: ["Management", "Impact", "Objectifs"]
    },
    {
      id: "sq-3",
      category: "team_culture",
      question: "Comment s'organise le partage de connaissances au sein de l'équipe (code reviews, documentation, veille tech) ?",
      impactReason: "Démontre que vous accordez de l'importance aux bonnes pratiques, à l'apprentissage continu et à la rigueur collective.",
      tags: ["Culture", "Mentorat", "Qualité"]
    },
    {
      id: "sq-4",
      category: "business_vision",
      question: "Quel a été le défi ou le tournant le plus marquant de votre produit ces 6 derniers mois ?",
      impactReason: "Vous amène à dialoguer d'égal à égal sur les enjeux stratégiques réels de l'entreprise.",
      tags: ["Business", "Produit", "Vision"]
    },
    {
      id: "sq-5",
      category: "architecture",
      question: "Comment gérez-vous la mise en production de vos modèles ou applications (CI/CD, monitoring, tests automatisés) ?",
      impactReason: "Prouve que vous ne vous arrêtez pas au code local dans un notebook, mais que vous pensez au cycle de vie complet (MLOps / DevOps).",
      tags: ["MLOps", "DevOps", "Production"]
    }
  ],
  companySheets: [
    {
      id: "cs-demo",
      companyName: "Exemple : Entreprise Cible",
      roleTitle: "Stage PFE - Ingénieur Data Science & IA",
      strongPoints: [
        "Leur récente plateforme cloud et leurs investissements en IA",
        "Leur position de leader européen sur leur marché",
        "La taille humaine de l'équipe data qui permet une grande autonomie"
      ],
      keyChallenges: "Migration vers une architecture micro-services et volumétrie croissante des flux temps réel.",
      tailoredQuestions: [
        "Avez-vous déjà un orchestrateur (Airflow/Prefect) en place pour vos flux ?",
        "Comment interagissez-vous avec les équipes métiers pour valider les modèles ?"
      ],
      liveNotes: "Note d'appel : Entretien avec le Lead Data. Très intéressé par mes projets de Computer Vision. Prochaine étape : échange technique de 45 min la semaine prochaine.",
      updatedAt: new Date().toISOString()
    }
  ]
};

export function loadInterviewPrep(): InterviewPrepState {
  if (typeof window === "undefined") return DEFAULT_PREP_DATA;
  try {
    const raw = window.localStorage.getItem(PREP_STORAGE_KEY);
    if (!raw) return DEFAULT_PREP_DATA;
    const parsed = JSON.parse(raw);
    return {
      pitch: parsed.pitch || DEFAULT_PREP_DATA.pitch,
      qaList: Array.isArray(parsed.qaList) ? parsed.qaList : DEFAULT_PREP_DATA.qaList,
      strategicQuestions: Array.isArray(parsed.strategicQuestions) ? parsed.strategicQuestions : DEFAULT_PREP_DATA.strategicQuestions,
      companySheets: Array.isArray(parsed.companySheets) ? parsed.companySheets : DEFAULT_PREP_DATA.companySheets,
    };
  } catch {
    return DEFAULT_PREP_DATA;
  }
}

export function saveInterviewPrep(state: InterviewPrepState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREP_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Unable to save interview prep to localStorage", err);
  }
}
