import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";

export interface DialogueTurn {
  id: string;
  speaker: "rh" | "candidate" | "note";
  speakerLabel?: string; // e.g. "RH", "Madame X", "Toi", "Saïd", "Situation"
  text: string;
  alternative?: string; // e.g. "Ou plus simplement : Allô, bonjour !"
  options?: string[]; // Multiple choice answer variants (e.g. bullet points)
}

export interface ExpressionItem {
  id: string;
  folderId: string;
  title: string;
  type: "dialogue" | "paragraph";
  turns?: DialogueTurn[];
  paragraphContent?: string;
  notes?: string;
  tags?: string[];
  isFavorite?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpressionFolder {
  id: string;
  name: string;
  description?: string;
  icon: string; // "phone" | "mic" | "shield" | "sparkles" | "code" | "briefcase" | "folder"
  color: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const EXPRESSIONS_STORAGE_KEY = "truck_app_expression_items_v2";
export const FOLDERS_STORAGE_KEY = "truck_app_expression_folders_v2";
export const EXPRESSIONS_UPDATED_EVENT = "truck_app_expressions_updated";

// ---------------------------------------------------------------------------
// Default Seed Data
// ---------------------------------------------------------------------------

export const DEFAULT_EXPRESSION_FOLDERS: ExpressionFolder[] = [
  {
    id: "folder-rh-phone",
    name: "RH Interview - Décrochage & Filtrage Téléphonique",
    description: "Répliques réflexes lors d'un appel téléphonique inattendu d'un recruteur ou RH.",
    icon: "phone",
    color: "#ff5722",
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "folder-pitch",
    name: "Présentation & Pitch Personnel",
    description: "Discours continus et réponses fluides au format paragraphe pour 'Présentez-vous'.",
    icon: "mic",
    color: "#3b82f6",
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "folder-negociation",
    name: "Questions Délicates & Prétentions",
    description: "Réponses types pour les prétentions salariales / indemnité PFE et questions pièges.",
    icon: "shield",
    color: "#10b981",
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "folder-tech-star",
    name: "Entretien Technique & Méthode STAR",
    description: "Scénarios techniques pour expliquer des défis d'architecture, IA et microservices.",
    icon: "code",
    color: "#8b5cf6",
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_EXPRESSION_ITEMS: ExpressionItem[] = [
  {
    id: "item-phone-1",
    folderId: "folder-rh-phone",
    title: "1. Premier contact & Décrochage (Quand tu décroches le téléphone)",
    type: "dialogue",
    tags: ["Téléphone", "Accroche", "Premier contact"],
    notes: "Adopter une voix posée, souriante et dynamique. Si vous êtes dans un endroit bruyant, demandez poliment 30 secondes pour vous isoler.",
    isFavorite: true,
    sortOrder: 1,
    turns: [
      {
        id: "t-11",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Allô, bonjour !",
      },
      {
        id: "t-12",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Allô, bonjour !",
        options: ["Bonjour Madame !", "Oui, bonjour !"],
      },
      {
        id: "t-13",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Est-ce que je parle bien à Monsieur Saïd Nichan ?",
      },
      {
        id: "t-14",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Oui, tout à fait, c'est bien moi.",
        options: ["Oui, effectivement.", "Oui, je vous écoute."],
      },
      {
        id: "t-15",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Je suis Madame X, de la société [Nom de l'entreprise].",
      },
      {
        id: "t-16",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Enchanté Madame, je vous écoute.",
        options: [
          "Ah oui, très bien, bonjour Madame.",
          "Bonjour Madame, merci pour votre appel.",
        ],
      },
      {
        id: "t-17",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Est-ce que vous êtes disponible pour échanger quelques minutes ?",
      },
      {
        id: "t-18",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Oui, bien sûr, je suis disponible.",
        options: ["Oui, aucun souci, je vous écoute.", "Oui, avec plaisir !"],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-phone-2",
    folderId: "folder-rh-phone",
    title: "2. La RH explique la raison de son appel (Offre de stage PFE)",
    type: "dialogue",
    tags: ["Candidature", "Stage PFE", "Motivation"],
    notes: "Montrer immédiatement de l'enthousiasme sans en faire trop. Confirmer tout de suite la recherche active d'un stage PFE de fin d'études.",
    isFavorite: true,
    sortOrder: 2,
    turns: [
      {
        id: "t-21",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Je vous contacte concernant votre candidature pour notre offre de stage PFE en développement informatique.",
      },
      {
        id: "t-22",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Ah oui, tout à fait ! Je suis ravi d'avoir votre retour.",
        options: [
          "Oui, effectivement, j'ai bien postulé à cette offre.",
          "Ah oui, je vois très bien. Merci de m'avoir contacté.",
          "Oui, bien sûr, je suis toujours intéressé par cette opportunité.",
        ],
      },
      {
        id: "t-23",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Vous êtes toujours à la recherche d'un stage PFE ?",
      },
      {
        id: "t-24",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Oui, absolument. Je suis actuellement à la recherche d'un stage PFE de six mois, à partir de février 2027.",
        alternative: "Oui, tout à fait. Je suis toujours à la recherche d'un stage pour ma dernière année d'études.",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-phone-3",
    folderId: "folder-rh-phone",
    title: "3. Si la RH te demande de te présenter (Présentation 40 à 60 secondes)",
    type: "dialogue",
    tags: ["Présentation", "Pitch", "ENSA Tanger", "Full Stack"],
    notes: "Ne parle pas trop vite. Une présentation posée de 40 à 60 secondes est suffisante.",
    isFavorite: true,
    sortOrder: 3,
    turns: [
      {
        id: "t-31",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Est-ce que vous pouvez vous présenter brièvement ?",
      },
      {
        id: "t-32",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Oui, bien sûr ! Alors, je suis étudiant en cinquième année du cycle ingénieur en Génie Informatique à l'ENSA de Tanger.\n\nJe suis particulièrement intéressé par le développement logiciel, notamment le Backend et le Full Stack, ainsi que l'intégration de solutions d'intelligence artificielle.\n\nJ'ai réalisé un stage en développement Full Stack durant lequel j'ai notamment travaillé sur un chatbot basé sur l'approche RAG. J'ai également travaillé sur plusieurs projets académiques qui m'ont permis de développer mes compétences techniques et mon esprit d'équipe.\n\nAujourd'hui, je cherche un stage PFE qui me permettra de mettre en pratique mes compétences et de contribuer à des projets concrets.",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-phone-4",
    folderId: "folder-rh-phone",
    title: "4. Questions RH : Pourquoi notre entreprise, Compétences & NextStep AI",
    type: "dialogue",
    tags: ["Motivation", "Java", "Spring Boot", "Angular", "RAG"],
    notes: "Mettre en avant les technologies concrètes (Java, Spring Boot, Angular, React, RAG, NextStep AI).",
    isFavorite: false,
    sortOrder: 4,
    turns: [
      {
        id: "t-41",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Pourquoi avez-vous choisi notre entreprise ?",
      },
      {
        id: "t-42",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Ce qui m'intéresse chez vous, c'est principalement l'environnement technique et les opportunités de travailler sur des projets concrets. J'aimerais beaucoup rejoindre une équipe dans laquelle je pourrais apprendre, partager mes connaissances et apporter ma contribution.",
      },
      {
        id: "t-43",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Quelles sont vos principales compétences ?",
      },
      {
        id: "t-44",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Principalement le développement Backend avec Java et Spring Boot, le développement Frontend avec Angular et React, ainsi que les bases de données SQL. J'ai également des connaissances en Docker, CI/CD et intégration de solutions IA, notamment avec RAG et les agents intelligents.",
      },
      {
        id: "t-45",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Avez-vous déjà une expérience professionnelle ?",
      },
      {
        id: "t-46",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Oui, j'ai effectué un stage de deux mois chez Smart Automation Technologie, où j'ai travaillé sur des applications Full Stack avec Angular. J'ai également participé au développement d'un chatbot basé sur RAG.",
      },
      {
        id: "t-47",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Travaillez-vous actuellement sur des projets ?",
      },
      {
        id: "t-48",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Oui, actuellement, je travaille sur plusieurs projets académiques, notamment une plateforme appelée NextStep AI, qui est un assistant intelligent pour accompagner les candidats dans leur recherche d'emploi. Je travaille principalement sur la partie Backend et l'intégration IA.",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-phone-5",
    folderId: "folder-rh-phone",
    title: "5. Disponibilité, Dates de stage & Mobilité géographique",
    type: "dialogue",
    tags: ["Disponibilité", "Mobilité", "Dates", "Salé", "Tanger"],
    notes: "Clarté immédiate sur la date de début (1er février 2027) et flexibilité géographique totale.",
    isFavorite: true,
    sortOrder: 5,
    turns: [
      {
        id: "t-51",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Quand pouvez-vous commencer ?",
      },
      {
        id: "t-52",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Je serai disponible à partir du 1er février 2027, pour une durée de six mois.",
      },
      {
        id: "t-53",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Êtes-vous mobile ?",
      },
      {
        id: "t-54",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Oui, je suis ouvert à la mobilité nationale. Je peux me déplacer selon les besoins du stage.",
      },
      {
        id: "t-55",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Vous êtes actuellement à Tanger ?",
      },
      {
        id: "t-56",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Je suis actuellement basé à Salé, mais je fais mes études à l'ENSA de Tanger. Je suis ouvert à une opportunité dans une autre ville.",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-phone-6",
    folderId: "folder-rh-phone",
    title: "6. Si la RH te propose un entretien (Fixation de date & créneau)",
    type: "dialogue",
    tags: ["Entretien technique", "Date", "Organisation"],
    notes: "Valider le créneau avec enthousiasme et confirmer la réception de l'invitation e-mail.",
    isFavorite: true,
    sortOrder: 6,
    turns: [
      {
        id: "t-61",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Votre profil nous intéresse. Nous souhaitons organiser un entretien technique avec vous.",
      },
      {
        id: "t-62",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Ah, très bien ! Avec plaisir. Je serais ravi d'échanger avec votre équipe.",
      },
      {
        id: "t-63",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Est-ce que vous êtes disponible jeudi à 10 h ?",
      },
      {
        id: "t-64",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Oui, jeudi à 10 h, ça me convient parfaitement.",
        options: [
          "Oui, aucun problème pour moi.",
          "Oui, je serai disponible.",
          "Parfait, je bloque ce créneau. Merci beaucoup !",
        ],
      },
      {
        id: "t-65",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Vous recevrez une invitation par e-mail.",
      },
      {
        id: "t-66",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "D'accord, très bien. Je resterai attentif à mon e-mail. Merci !",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-phone-7",
    folderId: "folder-rh-phone",
    title: "7. Si tu n'es pas disponible ou si tu as besoin de précisions",
    type: "dialogue",
    tags: ["Imprévus", "Reporter", "Précision", "Honnêteté"],
    notes: "Toujours proposer une alternative positive quand un créneau ne convient pas. Rester honnête sur les technos inconnues.",
    isFavorite: false,
    sortOrder: 7,
    turns: [
      {
        id: "t-71",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Est-ce que vous êtes disponible demain à 9 h ?",
      },
      {
        id: "t-72",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Malheureusement, je ne suis pas disponible à cette heure-là. Est-ce qu'il serait possible de prévoir un autre créneau, par exemple dans l'après-midi ?",
      },
      {
        id: "t-73",
        speaker: "note",
        speakerLabel: "Si tu n'as pas compris ou mauvaise ligne :",
        text: "Demander poliment de répéter",
      },
      {
        id: "t-74",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Excusez-moi, vous pouvez répéter s'il vous plaît ?",
        options: [
          "Pardon, je n'ai pas bien compris la dernière partie.",
          "Juste pour être sûr d'avoir bien compris, vous souhaitez organiser un entretien technique, c'est bien ça ?",
        ],
      },
      {
        id: "t-75",
        speaker: "note",
        speakerLabel: "Si la RH te pose une question dont tu ne connais pas la réponse :",
        text: "Honnêteté et envie d'apprendre",
      },
      {
        id: "t-76",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Honnêtement, je n'ai pas encore eu l'occasion de travailler sur cette technologie, mais je suis très intéressé pour la découvrir et monter rapidement en compétences dessus.",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-phone-8",
    folderId: "folder-rh-phone",
    title: "8. À la fin de l'appel (Clôture & Remerciements)",
    type: "dialogue",
    tags: ["Clôture", "Politesse", "Fin d'appel"],
    notes: "Terminer sur une note très chaleureuse et professionnelle.",
    isFavorite: true,
    sortOrder: 8,
    turns: [
      {
        id: "t-81",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Très bien, merci pour votre disponibilité. Nous reviendrons vers vous prochainement.",
      },
      {
        id: "t-82",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Très bien, merci beaucoup pour votre appel et pour cet échange. Je reste disponible si vous avez besoin d'informations complémentaires. Je vous souhaite une excellente journée. Au revoir Madame !",
        options: [
          "Merci à vous, c'était un plaisir d'échanger avec vous. Bonne journée !",
          "Merci beaucoup pour votre retour. À bientôt, bonne journée !",
          "Parfait, merci encore. Je vous souhaite une très bonne journée. Au revoir !",
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-pitch-1",
    folderId: "folder-pitch",
    title: "Pitch 1 min : « Présentez-vous » (Élève-Ingénieur ENSA Tanger)",
    type: "paragraph",
    tags: ["Pitch", "Présentez-vous", "ENSA Tanger", "Full Stack"],
    notes: "À réciter de façon fluide et naturelle. Rester sous les 60 secondes.",
    isFavorite: true,
    sortOrder: 1,
    paragraphContent: `Bonjour, je suis étudiant en cinquième année du cycle ingénieur en Génie Informatique à l'ENSA de Tanger.

Je suis particulièrement intéressé par le développement logiciel, notamment le Backend et le Full Stack, ainsi que l'intégration de solutions d'intelligence artificielle.

J'ai réalisé un stage en développement Full Stack durant lequel j'ai notamment travaillé sur un chatbot basé sur l'approche RAG. J'ai également travaillé sur plusieurs projets académiques, notamment NextStep AI, qui m'ont permis de développer mes compétences techniques et mon esprit d'équipe.

Aujourd'hui, je cherche un stage PFE de 6 mois à partir de février 2027 qui me permettra de mettre en pratique mes compétences et de contribuer à des projets concrets.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-pitch-2",
    folderId: "folder-pitch",
    title: "Pourquoi l'Intelligence Artificielle & le Full Stack ?",
    type: "paragraph",
    tags: ["Motivation", "Tech", "Vision"],
    notes: "Explique la cohérence entre le socle de développement logiciel robuste et la valeur ajoutée des modèles IA.",
    isFavorite: false,
    sortOrder: 2,
    paragraphContent: `Je suis convaincu qu'un modèle d'intelligence artificielle n'a de réelle valeur que s'il est intégré au sein d'une architecture logicielle robuste, scalable et bien testée. 

C'est pourquoi j'accorde autant d'importance à la qualité du code, aux API REST, aux pipelines CI/CD et à la conteneurisation Docker qu'à l'entraînement des algorithmes de Machine Learning. Mon objectif est d'être un ingénieur complet capable de transformer des données brutes en produit fini disponible pour les utilisateurs finaux.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-nego-1",
    folderId: "folder-negociation",
    title: "Prétentions d'indemnité pour le stage PFE",
    type: "dialogue",
    tags: ["Indemnité", "Salaire", "Négociation"],
    notes: "Ne jamais se bloquer sur un chiffre fixe. Privilégier la valeur du projet et l'opportunité d'embauche post-PFE.",
    isFavorite: true,
    sortOrder: 1,
    turns: [
      {
        id: "t-41",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Avez-vous des attentes particulières concernant l'indemnité de stage ?",
      },
      {
        id: "t-42",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Pour ce stage PFE de fin d'études, mes attentes se situent dans la fourchette standard du marché pour un profil ingénieur, entre [1 200 € et 1 500 € / mois selon les avantages]. Ma priorité reste avant tout la qualité technique de la mission et la perspective de continuer ensemble en CDI à l'issue du stage.",
        alternative: "Je m'aligne sur la grille de gratification en vigueur dans votre entreprise pour les élèves-ingénieurs de fin d'études.",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Smart Paste Engine (Regex & Heuristics)
// ---------------------------------------------------------------------------

export interface ParsedPasteResult {
  title: string;
  type: "dialogue" | "paragraph";
  turns: DialogueTurn[];
  paragraphContent: string;
  notes?: string;
  tags: string[];
}

function cleanQuote(str: string): string {
  return str
    .replace(/^[-•*]\s*/, "")
    .replace(/^[«"']\s*/, "")
    .replace(/\s*[»"']$/, "")
    .trim();
}

/**
 * Parses raw text copied from ChatGPT, LinkedIn or notes
 * and turns it into one or multiple structured Expression items.
 */
export function parseSmartPaste(rawText: string, defaultFolderId: string): ExpressionItem[] {
  let text = rawText.trim();
  if (!text) return [];

  // Normalize: If text doesn't start with a number like "1.", but contains dialogue, add virtual "1."
  if (!/^[0-9]+\.\s+/.test(text) && /(RH|Recruteur|Toi)\s*:/i.test(text)) {
    text = "1. Scénario d'appel\n" + text;
  }

  // Check if text has multiple numbered sections, e.g. "1. Quand tu décroches...", "2. Si la RH..."
  const sectionRegex = /(?:^|\n)(?=[0-9]+\.\s+)/g;
  const parts = text.split(sectionRegex).map((p) => p.trim()).filter(Boolean);

  if (parts.length > 1) {
    return parts.map((part, index) => {
      const parsed = parseSingleBlock(part);
      return {
        id: `smart-item-${Date.now()}-${index}`,
        folderId: defaultFolderId,
        title: parsed.title || `Scénario ${index + 1}`,
        type: parsed.type,
        turns: parsed.turns,
        paragraphContent: parsed.paragraphContent,
        notes: parsed.notes,
        tags: parsed.tags,
        isFavorite: false,
        sortOrder: index + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  // Single block
  const single = parseSingleBlock(text);
  return [
    {
      id: `smart-item-${Date.now()}-0`,
      folderId: defaultFolderId,
      title: single.title || "Scénario d'entretien",
      type: single.type,
      turns: single.turns,
      paragraphContent: single.paragraphContent,
      notes: single.notes,
      tags: single.tags,
      isFavorite: false,
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

function parseSingleBlock(block: string): ParsedPasteResult {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return {
      title: "Nouvelle fiche",
      type: "paragraph",
      turns: [],
      paragraphContent: "",
      tags: [],
    };
  }

  let title = "";
  const firstLine = lines[0];

  // If first line looks like a title: "1. Quand tu décroches le téléphone" or "### Titre"
  if (
    /^[0-9]+\.\s+/.test(firstLine) ||
    firstLine.startsWith("#") ||
    (firstLine.length < 90 && !firstLine.includes(":"))
  ) {
    title = firstLine.replace(/^#+\s*/, "");
    lines.shift();
  }

  // Check for dialogue speakers in remaining lines
  const rhPattern = /^(RH|Recruteur|Recruteuse|Lui|Elle|Entreprise|Interviewer)\s*:\s*(.*)$/i;
  const candidatePattern = /^(Toi|Moi|Candidat|Sa[ïi]d|Moi-m[êe]me|Candidate)(.*)$/i;
  const optionsHeaderPattern = /^(Autres possibilit[ée]s|Autres r[ée]ponses|Plusieurs possibilit[ée]s|Options?|Choix|R[ée]ponses possibles)\s*:?\s*$/i;
  const alternativeHeaderPattern = /^(Ou plus simplement|Ou plus naturellement|Plus naturellement|Variante|Autre option|Alternative)\s*:?\s*$/i;
  const bulletPattern = /^[-•*]\s+(.+)$/;
  const tipPattern = /^(Astuce|Conseil|Note|Attention)\s*:\s*(.+)$/i;
  const situationSubPattern = /^(Si tu|Si la RH|Quand|Pour|Au cas o[ùu])\s*(.*):\s*(.*)$/i;

  let hasDialogue = false;
  for (const line of lines) {
    if (rhPattern.test(line) || candidatePattern.test(line) || bulletPattern.test(line)) {
      hasDialogue = true;
      break;
    }
  }

  if (!hasDialogue) {
    const paragraph = lines.join("\n\n");
    return {
      title: title || "Présentation & Pitch",
      type: "paragraph",
      turns: [],
      paragraphContent: paragraph,
      tags: ["Présentation", "Pitch"],
    };
  }

  // Parse turns of dialogue
  const turns: DialogueTurn[] = [];
  let notes = "";
  let pendingAlternative = false;
  let pendingOptions = false;
  let activeTurn: DialogueTurn | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Tip / Advice
    const tipMatch = line.match(tipPattern);
    if (tipMatch) {
      notes = (notes ? notes + "\n" : "") + tipMatch[2].trim();
      continue;
    }

    // Alternative header
    if (alternativeHeaderPattern.test(line)) {
      pendingAlternative = true;
      pendingOptions = false;
      continue;
    }

    // Options header
    if (optionsHeaderPattern.test(line)) {
      pendingOptions = true;
      pendingAlternative = false;
      continue;
    }

    // RH line
    const rhMatch = line.match(rhPattern);
    if (rhMatch) {
      activeTurn = {
        id: `turn-${Date.now()}-${turns.length}`,
        speaker: "rh",
        speakerLabel: rhMatch[1].trim(),
        text: cleanQuote(rhMatch[2].trim()),
        options: [],
      };
      turns.push(activeTurn);
      pendingAlternative = false;
      pendingOptions = false;
      continue;
    }

    // Candidate line
    const candMatch = line.match(candidatePattern);
    if (candMatch) {
      let rest = candMatch[2].replace(/^(\s*–|\s*-|\s*:)+/, "").trim();
      if (/^plusieurs\s+possibilit[ée]s/i.test(rest)) {
        rest = "";
      }

      activeTurn = {
        id: `turn-${Date.now()}-${turns.length}`,
        speaker: "candidate",
        speakerLabel: candMatch[1].trim(),
        text: cleanQuote(rest),
        options: [],
      };
      turns.push(activeTurn);
      pendingAlternative = false;
      pendingOptions = false;
      continue;
    }

    // Bullet point line
    const bulletMatch = line.match(bulletPattern);
    if (bulletMatch) {
      const bulletText = cleanQuote(bulletMatch[1]);
      if (activeTurn && activeTurn.speaker === "candidate") {
        if (!activeTurn.text) {
          activeTurn.text = bulletText;
        } else {
          if (!activeTurn.options) activeTurn.options = [];
          activeTurn.options.push(bulletText);
        }
      } else {
        activeTurn = {
          id: `turn-${Date.now()}-${turns.length}`,
          speaker: "candidate",
          speakerLabel: "Toi",
          text: bulletText,
          options: [],
        };
        turns.push(activeTurn);
      }
      continue;
    }

    // Situation sub-header, e.g. "Si tu n'as pas compris :"
    const situMatch = line.match(situationSubPattern);
    if (situMatch) {
      const subLabel = line.replace(/:$/, "").trim();
      activeTurn = {
        id: `turn-${Date.now()}-${turns.length}`,
        speaker: "note",
        speakerLabel: subLabel,
        text: situMatch[3] ? cleanQuote(situMatch[3]) : "",
        options: [],
      };
      turns.push(activeTurn);
      continue;
    }

    // Standalone quote or alternative line
    if (pendingAlternative && activeTurn) {
      activeTurn.alternative = cleanQuote(line);
      pendingAlternative = false;
      continue;
    }

    if (pendingOptions && activeTurn) {
      if (!activeTurn.options) activeTurn.options = [];
      activeTurn.options.push(cleanQuote(line));
      continue;
    }

    // Append to active turn text
    if (activeTurn) {
      const cleaned = cleanQuote(line);
      if (!activeTurn.text) {
        activeTurn.text = cleaned;
      } else {
        activeTurn.text += "\n" + cleaned;
      }
    }
  }

  return {
    title: title || "Scénario téléphonique",
    type: "dialogue",
    turns,
    paragraphContent: "",
    notes: notes || undefined,
    tags: ["Dialogue", "Entretien"],
  };
}

// ---------------------------------------------------------------------------
// LocalStorage & Supabase Sync Engine
// ---------------------------------------------------------------------------

async function resolveUserId(): Promise<string | null> {
  try {
    const uid = await getAuthUserId();
    if (uid) return uid;
  } catch {}
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export function loadLocalExpressionsData(): {
  folders: ExpressionFolder[];
  items: ExpressionItem[];
} {
  if (typeof window === "undefined") {
    return {
      folders: [...DEFAULT_EXPRESSION_FOLDERS],
      items: [...DEFAULT_EXPRESSION_ITEMS],
    };
  }

  try {
    const savedFolders = localStorage.getItem(FOLDERS_STORAGE_KEY);
    const savedItems = localStorage.getItem(EXPRESSIONS_STORAGE_KEY);

    let folders = savedFolders ? JSON.parse(savedFolders) : null;
    let items = savedItems ? JSON.parse(savedItems) : null;

    if (!Array.isArray(folders) || folders.length === 0) {
      folders = [...DEFAULT_EXPRESSION_FOLDERS];
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    }

    if (!Array.isArray(items) || items.length === 0) {
      items = [...DEFAULT_EXPRESSION_ITEMS];
      localStorage.setItem(EXPRESSIONS_STORAGE_KEY, JSON.stringify(items));
    }

    return { folders, items };
  } catch (e) {
    console.warn("Error reading local expressions:", e);
    return {
      folders: [...DEFAULT_EXPRESSION_FOLDERS],
      items: [...DEFAULT_EXPRESSION_ITEMS],
    };
  }
}

export function saveLocalExpressionsData(
  folders: ExpressionFolder[],
  items: ExpressionItem[]
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    localStorage.setItem(EXPRESSIONS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(EXPRESSIONS_UPDATED_EVENT));
  } catch (e) {
    console.error("Unable to save local expressions data:", e);
  }
}

export async function syncExpressionsWithSupabase(): Promise<{
  folders: ExpressionFolder[];
  items: ExpressionItem[];
}> {
  const local = loadLocalExpressionsData();
  const userId = await resolveUserId();

  if (!userId) {
    return local;
  }

  try {
    // 1. Fetch remote folders
    const { data: remoteFolders, error: folderErr } = await supabase
      .from("user_expression_folders")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    // 2. Fetch remote items
    const { data: remoteItems, error: itemsErr } = await supabase
      .from("user_expression_items")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (folderErr || itemsErr) {
      console.warn("Supabase expressions query warning:", folderErr?.message || itemsErr?.message);
      return local;
    }

    // If remote is empty, seed remote with default/local data
    if ((!remoteFolders || remoteFolders.length === 0) && (!remoteItems || remoteItems.length === 0)) {
      await pushLocalDataToSupabase(userId, local.folders, local.items);
      return local;
    }

    // Convert remote folders
    const formattedFolders: ExpressionFolder[] = (remoteFolders || []).map((rf: any) => ({
      id: rf.id,
      name: rf.name,
      description: rf.description || "",
      icon: rf.icon || "folder",
      color: rf.color || "#ff5722",
      sortOrder: rf.sort_order ?? 0,
      createdAt: rf.created_at,
      updatedAt: rf.updated_at,
    }));

    // Convert remote items
    const formattedItems: ExpressionItem[] = (remoteItems || []).map((ri: any) => ({
      id: ri.id,
      folderId: ri.folder_id,
      title: ri.title,
      type: ri.type,
      turns: Array.isArray(ri.dialogue_content) ? ri.dialogue_content : [],
      paragraphContent: ri.paragraph_content || "",
      notes: ri.notes || "",
      tags: Array.isArray(ri.tags) ? ri.tags : [],
      isFavorite: Boolean(ri.is_favorite),
      sortOrder: ri.sort_order ?? 0,
      createdAt: ri.created_at,
      updatedAt: ri.updated_at,
    }));

    // Save remote version to localStorage cache
    saveLocalExpressionsData(formattedFolders, formattedItems);
    return { folders: formattedFolders, items: formattedItems };
  } catch (err) {
    console.warn("Sync expressions failed:", err);
    return local;
  }
}

async function pushLocalDataToSupabase(
  userId: string,
  folders: ExpressionFolder[],
  items: ExpressionItem[]
) {
  try {
    const foldersPayload = folders.map((f, idx) => ({
      id: f.id,
      user_id: userId,
      name: f.name,
      description: f.description || "",
      icon: f.icon || "folder",
      color: f.color || "#ff5722",
      sort_order: f.sortOrder ?? idx,
      created_at: f.createdAt || new Date().toISOString(),
      updated_at: f.updatedAt || new Date().toISOString(),
    }));

    await supabase.from("user_expression_folders").upsert(foldersPayload, { onConflict: "user_id,id" });

    const itemsPayload = items.map((it, idx) => ({
      id: it.id,
      folder_id: it.folderId,
      user_id: userId,
      title: it.title,
      type: it.type,
      dialogue_content: it.turns || [],
      paragraph_content: it.paragraphContent || "",
      notes: it.notes || "",
      tags: it.tags || [],
      is_favorite: Boolean(it.isFavorite),
      sort_order: it.sortOrder ?? idx,
      created_at: it.createdAt || new Date().toISOString(),
      updated_at: it.updatedAt || new Date().toISOString(),
    }));

    await supabase.from("user_expression_items").upsert(itemsPayload, { onConflict: "user_id,id" });
  } catch (err) {
    console.error("Failed to seed initial expressions to Supabase:", err);
  }
}

export async function upsertFolderRemote(folder: ExpressionFolder): Promise<void> {
  const userId = await resolveUserId();
  if (!userId) return;

  try {
    await supabase.from("user_expression_folders").upsert(
      {
        id: folder.id,
        user_id: userId,
        name: folder.name,
        description: folder.description || "",
        icon: folder.icon || "folder",
        color: folder.color || "#ff5722",
        sort_order: folder.sortOrder ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,id" }
    );
  } catch (e) {
    console.warn("Failed to upsert folder to Supabase:", e);
  }
}

export async function deleteFolderRemote(folderId: string): Promise<void> {
  const userId = await resolveUserId();
  if (!userId) return;

  try {
    await supabase.from("user_expression_folders").delete().eq("user_id", userId).eq("id", folderId);
  } catch (e) {
    console.warn("Failed to delete folder from Supabase:", e);
  }
}

export async function upsertItemRemote(item: ExpressionItem): Promise<void> {
  const userId = await resolveUserId();
  if (!userId) return;

  try {
    await supabase.from("user_expression_items").upsert(
      {
        id: item.id,
        folder_id: item.folderId,
        user_id: userId,
        title: item.title,
        type: item.type,
        dialogue_content: item.turns || [],
        paragraph_content: item.paragraphContent || "",
        notes: item.notes || "",
        tags: item.tags || [],
        is_favorite: Boolean(item.isFavorite),
        sort_order: item.sortOrder ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,id" }
    );
  } catch (e) {
    console.warn("Failed to upsert expression item to Supabase:", e);
  }
}

export async function deleteItemRemote(itemId: string): Promise<void> {
  const userId = await resolveUserId();
  if (!userId) return;

  try {
    await supabase.from("user_expression_items").delete().eq("user_id", userId).eq("id", itemId);
  } catch (e) {
    console.warn("Failed to delete expression item from Supabase:", e);
  }
}
