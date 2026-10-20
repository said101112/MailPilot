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
  domain?: string;
  question: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  fullAnswer?: string;
  keyTip?: string;
  difficulty?: "junior" | "mid" | "senior";
  tags?: string[];
  createdAt?: string;
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
  companyId?: string | null;
  companyName: string;
  domain?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  sector?: string | null;
  location?: string | null;
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
  practiceScores?: Record<string, "mastered" | "review" | "difficult">;
  readinessChecklist?: Record<string, boolean>;
}

export const PREP_STORAGE_KEY = "mailpilot_interview_prep_v2";

export const SECTOR_PRESETS: Record<
  string,
  { label: string; strongPoints: string[]; questions: string[] }
> = {
  fintech: {
    label: "Fintech & Banque",
    strongPoints: [
      "Leur rigueur sur la sécurité et le traitement de données financières à haute fréquence",
      "Leurs investissements continus dans l'automatisation et la détection de fraudes",
      "La conformité réglementaire et la scalabilité de leur infrastructure",
    ],
    questions: [
      "Comment gérez-vous la latence et l'auditabilité de vos modèles de décision financière ?",
      "Quelle est votre stratégie face aux réglementations sur l'explicabilité des algorithmes (AI Act) ?",
      "Comment s'organise la validation entre les équipes de data science et la gestion des risques ?",
    ],
  },
  saas: {
    label: "SaaS & Cloud Software",
    strongPoints: [
      "Leur culture produit centrée sur l'expérience utilisateur et les retours rapides",
      "Leur architecture cloud-native et leur vélocité de déploiement en CI/CD",
      "L'impact direct des analyses de données sur la rétention et l'activation client",
    ],
    questions: [
      "Quels outils utilisez-vous pour tracker les signaux de churn et le product usage ?",
      "Comment l'équipe data collabore-t-elle avec les Product Managers et développeurs au quotidien ?",
      "Quelle est votre stack actuelle pour le feature store et les déploiements de modèles ?",
    ],
  },
  healthtech: {
    label: "Santé & Healthtech",
    strongPoints: [
      "Le sens et l'impact sociétal direct de leurs technologies pour les soignants et patients",
      "Leur maîtrise du traitement de données de santé hautement sensibles et sécurisées",
      "L'exigence d'excellence et de validation clinique de leurs algorithmes",
    ],
    questions: [
      "Comment abordez-vous les contraintes de confidentialité (RGPD, HDS) dans vos pipelines de données ?",
      "Quel est le processus de validation humaine avant la mise en production d'un modèle ?",
      "Comment gérez-vous la rareté ou le déséquilibre des données médicales annotées ?",
    ],
  },
  ecommerce: {
    label: "E-Commerce, Retail & Logistique",
    strongPoints: [
      "Leur volumétrie de données transactionnelles et la richesse du catalogue",
      "Leurs algorithmes de recommandation, de search et d'optimisation de pricing",
      "Leur capacité à gérer les pics de charge saisonniers et l'optimisation logistique",
    ],
    questions: [
      "Comment mesurez-vous l'impact incrémental de votre moteur de recommandation en A/B testing ?",
      "Quels défis rencontrez-vous sur la réconciliation des données omnicanales et stocks ?",
      "Comment traitez-vous les problèmes de cold-start pour les nouveaux produits ou utilisateurs ?",
    ],
  },
  defense_industry: {
    label: "Industrie, Aérospatial & Défense",
    strongPoints: [
      "La robustesse extrême exigée pour les systèmes critiques et embarqués",
      "Leurs technologies de pointe et la culture d'excellence technique de l'équipe",
      "Leur vision à long terme sur des programmes d'envergure et la souveraineté technologique",
    ],
    questions: [
      "Travaillez-vous sur des architectures embarquées ou edge computing pour vos modèles ?",
      "Comment gérez-vous les environnements déconnectés (air-gapped) et les contraintes temps réel ?",
      "Quelles sont vos pratiques pour la traçabilité des données d'entraînement et la reproductibilité ?",
    ],
  },
  general: {
    label: "Général / Autre secteur",
    strongPoints: [
      "Leur positionnement et leur croissance sur leur marché cible",
      "La taille de l'équipe qui offre une excellente opportunité d'apprentissage et d'autonomie",
      "La modernité de leurs projets de transformation numérique et data",
    ],
    questions: [
      "Quelle est la plus grande dette technique de votre pipeline de données ou codebase actuel ?",
      "Quels critères précis détermineront que ce stage ou recrutement est un succès à 6 mois ?",
      "Comment s'organise le partage de connaissances au sein de l'équipe technique ?",
    ],
  },
};

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
      companyName: "Exemple : Capgemini",
      roleTitle: "Stage PFE - Ingénieur Data Science & IA",
      sector: "SaaS & Cloud Software",
      domain: "capgemini.com",
      strongPoints: [
        "Leur expertise reconnue dans le déploiement de solutions d'IA à grande échelle",
        "Leur position de leader international avec des projets multi-secteurs",
        "L'opportunité d'apprendre au contact d'architectes et de tech leads seniors"
      ],
      keyChallenges: "Industrialisation de modèles complexes et respect des exigences de sécurité client.",
      tailoredQuestions: [
        "Quelle est votre stack actuelle pour le déploiement et le monitoring de modèles en production ?",
        "Comment s'organise l'intégration d'un stagiaire PFE au sein de vos équipes projets ?"
      ],
      liveNotes: "Entretien RH initial très positif. Préparer pour le second tour : explications claires sur mon projet de classification NLP.",
      updatedAt: new Date().toISOString()
    }
  ],
  practiceScores: {},
  readinessChecklist: {
    pitch_ready: true,
    star_practiced: false,
    strategic_chosen: true,
    company_researched: true,
  }
};

export function loadInterviewPrep(): InterviewPrepState {
  if (typeof window === "undefined") return DEFAULT_PREP_DATA;
  try {
    const raw = window.localStorage.getItem(PREP_STORAGE_KEY);
    if (!raw) {
      // Migrate v1 to v2 if present
      const oldRaw = window.localStorage.getItem("mailpilot_interview_prep_v1");
      if (oldRaw) {
        const oldParsed = JSON.parse(oldRaw);
        return {
          ...DEFAULT_PREP_DATA,
          ...oldParsed,
        };
      }
      return DEFAULT_PREP_DATA;
    }
    const parsed = JSON.parse(raw);
    return {
      pitch: parsed.pitch || DEFAULT_PREP_DATA.pitch,
      qaList: Array.isArray(parsed.qaList) ? parsed.qaList : DEFAULT_PREP_DATA.qaList,
      strategicQuestions: Array.isArray(parsed.strategicQuestions) ? parsed.strategicQuestions : DEFAULT_PREP_DATA.strategicQuestions,
      companySheets: Array.isArray(parsed.companySheets) ? parsed.companySheets : DEFAULT_PREP_DATA.companySheets,
      practiceScores: parsed.practiceScores || {},
      readinessChecklist: parsed.readinessChecklist || DEFAULT_PREP_DATA.readinessChecklist,
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

// ---------------------------------------------------------------------------
// AI Prompt Studio & Smart Parser
// ---------------------------------------------------------------------------

export interface AIPromptOptions {
  domain: string;
  language: "fr" | "en";
  count: number;
  seniority: "internship_pfe" | "junior" | "mid";
  focus: "all" | "technical" | "behavioral" | "difficult";
}

export const PROMPT_DOMAIN_PRESETS = [
  { id: "data_science", name: "Data Science & Machine Learning", icon: "🧠" },
  { id: "python_fastapi", name: "Python & Backend (FastAPI / Django)", icon: "🐍" },
  { id: "data_engineering", name: "Data Engineering (SQL, Spark, Airflow)", icon: "⚙️" },
  { id: "sql_analytics", name: "SQL Avancé & Data Analytics", icon: "📊" },
  { id: "nlp_llm", name: "NLP, LLMs & IA Générative (LangChain, RAG)", icon: "🤖" },
  { id: "computer_vision", name: "Computer Vision & Deep Learning (PyTorch)", icon: "👁️" },
  { id: "react_nextjs", name: "Fullstack / Frontend (React, Next.js, TS)", icon: "💻" },
  { id: "devops_cloud", name: "DevOps & Cloud (Docker, Kubernetes, AWS)", icon: "☁️" },
  { id: "rh_behavioral", name: "Entretien RH & Questions Pièges", icon: "🎯" },
];

export function generateAIPrompt(options: AIPromptOptions): string {
  const isFr = options.language === "fr";
  const seniorityLabel = isFr
    ? options.seniority === "internship_pfe"
      ? "Stage PFE de fin d'études d'ingénieur (6 mois avec perspective d'embauche CDI)"
      : options.seniority === "junior"
        ? "Poste Premier Emploi / Junior (0-2 ans d'expérience)"
        : "Poste Intermédiaire"
    : options.seniority === "internship_pfe"
      ? "End-of-Studies Engineering Internship (6 months with full-time conversion perspective)"
      : options.seniority === "junior"
        ? "Junior / Entry-level role (0-2 years of experience)"
        : "Mid-level role";

  const focusLabel = isFr
    ? options.focus === "technical"
      ? "100% axées sur la technique, l'architecture et les pièges de code"
      : options.focus === "behavioral"
        ? "axées sur le comportement, le travail d'équipe et la gestion de projet"
        : options.focus === "difficult"
          ? "axées sur les questions pièges, mises en situation délicates et prétentions"
          : "équilibrées entre technique, architecture et mises en situation"
    : options.focus === "technical"
      ? "focused 100% on technical depth, architecture, and code gotchas"
      : options.focus === "behavioral"
        ? "focused on behavior, teamwork, and communication"
        : options.focus === "difficult"
          ? "focused on tricky questions and situational challenges"
          : "balanced between technical depth and situational questions";

  if (isFr) {
    return `Agis comme un Tech Lead senior et recruteur technique d'élite spécialisé dans le domaine : "${options.domain}".
Je prépare un entretien d'embauche pour le niveau suivant : ${seniorityLabel}.

Consigne : Génère exactement ${options.count} questions d'entretien réelles, percutantes et réalistes (${focusLabel}), avec pour chacune la réponse type idéale et le conseil clé du recruteur.

FORMAT DE SORTIE OBLIGATOIRE :
Tu dois répondre UNIQUEMENT avec un tableau JSON valide (sans aucun mot d'introduction, sans texte avant ou après, sans balises superflues). Respecte strictement ce schéma JSON :

[
  {
    "question": "Texte exact de la question posée par le recruteur",
    "category": "${options.focus === "technical" ? "technical" : options.focus === "behavioral" ? "behavioral" : "classic"}",
    "domain": "${options.domain}",
    "fullAnswer": "La réponse idéale, synthétique (3 à 5 phrases), structurée et convaincante que le candidat doit formuler.",
    "situation": "Optionnel : contexte d'exemple selon la méthode STAR",
    "action": "Optionnel : ce que le candidat a résolu concrètement",
    "result": "Optionnel : impact chiffré du résultat",
    "keyTip": "Le conseil d'or / le piège exact à éviter selon le recruteur."
  }
]

Sois précis, professionnel, exigeant et moderne (technologies actuelles de 2026). Donne les ${options.count} questions.`;
  }

  return `Act as an elite Tech Lead and Senior Technical Recruiter specialized in: "${options.domain}".
I am preparing for an interview for the following level: ${seniorityLabel}.

Generate exactly ${options.count} real-world, high-impact interview questions (${focusLabel}), each with the ideal benchmark answer and the recruiter's golden tip.

MANDATORY OUTPUT FORMAT:
You MUST reply ONLY with a valid JSON array (no conversational filler, no markdown wrappers, no intro, no outro). Strictly adhere to this JSON format:

[
  {
    "question": "Exact wording of the interview question",
    "category": "${options.focus === "technical" ? "technical" : options.focus === "behavioral" ? "behavioral" : "classic"}",
    "domain": "${options.domain}",
    "fullAnswer": "The ideal, punchy (3 to 5 sentences), structured and convincing answer the candidate should give.",
    "keyTip": "The recruiter's golden tip / trap to avoid."
  }
]

Be specific, challenging, and focused on modern industry practices for ${options.domain}.`;
}

export function parseAIResponse(rawText: string, fallbackDomain?: string): QuestionAnswerItem[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // 1. Try JSON extraction
  try {
    let cleanJson = trimmed;
    // Strip markdown code fences if present: ```json ... ```
    const matchFences = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (matchFences && matchFences[1]) {
      cleanJson = matchFences[1].trim();
    } else {
      // Find array boundaries [ ... ]
      const startIdx = trimmed.indexOf("[");
      const endIdx = trimmed.lastIndexOf("]");
      if (startIdx !== -1 && endIdx > startIdx) {
        cleanJson = trimmed.slice(startIdx, endIdx + 1);
      }
    }

    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any, idx: number): QuestionAnswerItem => {
        return {
          id: `qa-ai-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          category: ["classic", "technical", "behavioral", "difficult"].includes(item.category)
            ? item.category
            : "technical",
          domain: item.domain || fallbackDomain || "Tech",
          question: String(item.question || item.q || `Question ${idx + 1}`).trim(),
          fullAnswer: String(item.fullAnswer || item.answer || item.a || item.response || "").trim(),
          situation: item.situation ? String(item.situation).trim() : undefined,
          task: item.task ? String(item.task).trim() : undefined,
          action: item.action ? String(item.action).trim() : undefined,
          result: item.result ? String(item.result).trim() : undefined,
          keyTip: item.keyTip || item.tip ? String(item.keyTip || item.tip).trim() : undefined,
          createdAt: new Date().toISOString(),
        };
      });
    }
  } catch (jsonErr) {
    console.warn("JSON parsing failed, attempting line-by-line fallback parser...", jsonErr);
  }

  // 2. Line-by-line Fallback Parser (e.g. Q: ... A: ... or 1. Question: ... Réponse: ...)
  const items: QuestionAnswerItem[] = [];
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);

  let currentQuestion = "";
  let currentAnswer = "";
  let currentTip = "";

  const commitCurrent = () => {
    if (currentQuestion && (currentAnswer || currentTip)) {
      items.push({
        id: `qa-text-${Date.now()}-${items.length}-${Math.random().toString(36).slice(2, 6)}`,
        category: "technical",
        domain: fallbackDomain || "Tech",
        question: currentQuestion,
        fullAnswer: currentAnswer || currentTip,
        keyTip: currentTip || undefined,
        createdAt: new Date().toISOString(),
      });
      currentQuestion = "";
      currentAnswer = "";
      currentTip = "";
    }
  };

  for (const line of lines) {
    const isQ = /^(?:Q(?:\d+)?[:.]|Question(?:\s*\d+)?[:.]|\d+[\).]\s*|\*\*Q(?:uestion)?\d*[:\*])/i.test(line);
    const isA = /^(?:R(?:\d+)?[:.]|A(?:\d+)?[:.]|R[ée]ponse(?:\s*\d+)?[:.]|Answer(?:\s*\d+)?[:.]|\*\*R[ée]ponse[:\*])/i.test(line);
    const isTip = /^(?:Conseil[:.]|Astuce[:.]|Tip[:.]|KeyTip[:.]|\*\*Conseil[:\*])/i.test(line);

    if (isQ) {
      commitCurrent();
      currentQuestion = line.replace(/^(?:Q(?:\d+)?[:.]|Question(?:\s*\d+)?[:.]|\d+[\).]\s*|\*\*Q(?:uestion)?\d*[:\*])/i, "").trim();
    } else if (isA) {
      currentAnswer = line.replace(/^(?:R(?:\d+)?[:.]|A(?:\d+)?[:.]|R[ée]ponse(?:\s*\d+)?[:.]|Answer(?:\s*\d+)?[:.]|\*\*R[ée]ponse[:\*])/i, "").trim();
    } else if (isTip) {
      currentTip = line.replace(/^(?:Conseil[:.]|Astuce[:.]|Tip[:.]|KeyTip[:.]|\*\*Conseil[:\*])/i, "").trim();
    } else if (currentAnswer) {
      currentAnswer += " " + line;
    } else if (currentQuestion) {
      currentQuestion += " " + line;
    }
  }
  commitCurrent();

  return items;
}
