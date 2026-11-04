import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";

export interface DialogueTurn {
  id: string;
  speaker: "rh" | "candidate" | "note";
  speakerLabel?: string; // e.g. "RH", "Madame X", "Toi", "Saïd"
  text: string;
  alternative?: string; // e.g. "Ou plus naturellement : Allô, bonjour !"
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

export const EXPRESSIONS_STORAGE_KEY = "truck_app_expression_items_v1";
export const FOLDERS_STORAGE_KEY = "truck_app_expression_folders_v1";
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
    title: "1. Quand tu décroches le téléphone",
    type: "dialogue",
    tags: ["Téléphone", "Accroche", "Premier contact"],
    notes: "Adopter une voix posée, souriante et dynamique. Si vous êtes dans un environnement bruyant, demandez poliment 1 minute pour vous isoler.",
    isFavorite: true,
    sortOrder: 1,
    turns: [
      {
        id: "t-1",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Bonjour, je suis Madame X de la société [Nom de l'entreprise].",
      },
      {
        id: "t-2",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Bonjour Madame, oui, je vous écoute.",
        alternative: "Allô, bonjour !",
      },
      {
        id: "t-3",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Bonjour, est-ce que je parle bien à Saïd Nichan ?",
      },
      {
        id: "t-4",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Oui, tout à fait, c'est bien moi.",
      },
      {
        id: "t-5",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Vous êtes disponible pour parler quelques minutes ?",
      },
      {
        id: "t-6",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Oui, bien sûr, je suis disponible. Je vous écoute avec plaisir.",
        alternative: "Oui tout à fait, je suis au calme et disponible. Je vous écoute.",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-phone-2",
    folderId: "folder-rh-phone",
    title: "2. Si la RH te dit : « Je vous appelle concernant votre candidature »",
    type: "dialogue",
    tags: ["Candidature", "Stage PFE", "Motivation"],
    notes: "Montrer immédiatement de l'enthousiasme sans en faire trop. Confirmer tout de suite la recherche active d'un stage PFE.",
    isFavorite: true,
    sortOrder: 2,
    turns: [
      {
        id: "t-21",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Je vous appelle concernant votre candidature pour le stage PFE chez nous.",
      },
      {
        id: "t-22",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "Ah oui, tout à fait ! Merci beaucoup de m'avoir contacté. Je suis ravi d'échanger avec vous.",
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
        text: "Oui, tout à fait ! Je suis actuellement en dernière année de Génie Informatique à l'ENSA Tanger et je recherche activement mon stage de fin d'études de 4 à 6 mois à partir de février 2027.",
        alternative: "Oui absolument, je suis activement en recherche pour mon stage de fin d'études démarrant en février 2027.",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-phone-3",
    folderId: "folder-rh-phone",
    title: "3. Si la RH te demande : « Rappelez-moi pourquoi vous avez postulé chez nous ? »",
    type: "dialogue",
    tags: ["Motivation", "Culture", "Pitch rapide"],
    notes: "Avoir en tête un élément clé de l'entreprise (leur produit phare, leur stack technologique moderne, ou leurs défis de passage à l'échelle).",
    isFavorite: false,
    sortOrder: 3,
    turns: [
      {
        id: "t-31",
        speaker: "rh",
        speakerLabel: "RH",
        text: "Qu'est-ce qui a attiré votre attention dans notre offre ou notre entreprise ?",
      },
      {
        id: "t-32",
        speaker: "candidate",
        speakerLabel: "Toi",
        text: "J'ai suivi vos avancées sur [secteur ou technologie de l'entreprise], et vos enjeux de scalabilité correspondent exactement aux compétences que j'ai développées lors de mes stages précédents en microservices et IA.",
        alternative: "Votre positionnement sur des solutions à fort impact et l'excellence technique de votre équipe m'ont immédiatement convaincu de vous soumettre ma candidature.",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-pitch-1",
    folderId: "folder-pitch",
    title: "Pitch 1 min 30 : « Présentez-vous » (Élève-Ingénieur ENSA Tanger)",
    type: "paragraph",
    tags: ["Pitch", "Présentez-vous", "Général"],
    notes: "À réciter de façon fluide et naturelle. Rester sous les 90 secondes. Insister sur la double compétence développement logiciel & IA.",
    isFavorite: true,
    sortOrder: 1,
    paragraphContent: `Bonjour, je m'appelle Saïd Nichan, élève-ingénieur en dernière année de Génie Informatique à l'ENSA Tanger, spécialisé en Ingénierie Logicielle, Data Science et Intelligence Artificielle.

Durant mon parcours, j'ai eu l'opportunité de travailler sur des projets à forte exigence technique : chez FOCUS NEXT COMPUTING, j'ai développé des microservices Spring Boot autour des standards de santé HL7 FHIR avec sécurisation Keycloak et OPA. Chez Smart Automation Technologie, j'ai conçu un chatbot basé sur le RAG et automatisé des workflows avec n8n.

En parallèle, j'ai conçu NextStep, une plateforme intelligente de recherche d'emploi propulsée par des agents IA, et je suis certifié Oracle Java SE 17 OCP.

Ce qui me motive aujourd'hui, c'est de rejoindre votre équipe dans le cadre de mon stage de fin d'études à partir de février 2027, pour mettre mon énergie, ma rigueur technique et ma passion de l'apprentissage continu au service de vos projets opérationnels.`,
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

/**
 * Parses raw text copied from ChatGPT, LinkedIn or notes (like the user's screenshot)
 * and turns it into one or multiple structured Expression items.
 */
export function parseSmartPaste(rawText: string, defaultFolderId: string): ExpressionItem[] {
  const text = rawText.trim();
  if (!text) return [];

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
    firstLine.length < 90 && !firstLine.includes(":")
  ) {
    title = firstLine.replace(/^#+\s*/, "");
    lines.shift();
  }

  // Check for dialogue speakers in remaining lines
  const rhPattern = /^(RH|Recruteur|Recruteuse|Lui|Elle|Entreprise|Interviewer)\s*:\s*(.+)$/i;
  const candidatePattern = /^(Toi|Moi|Candidat|Sa[ïi]d|Moi-m[êe]me|Candidate)\s*:\s*(.+)$/i;
  const alternativeHeaderPattern = /^(Ou plus naturellement|Plus naturellement|Variante|Autre option|Alternative)\s*:?\s*$/i;

  let hasDialogue = false;
  for (const line of lines) {
    if (rhPattern.test(line) || candidatePattern.test(line) || alternativeHeaderPattern.test(line)) {
      hasDialogue = true;
      break;
    }
  }

  if (!hasDialogue) {
    // Treat as paragraph
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
  let pendingAlternative = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (alternativeHeaderPattern.test(line)) {
      pendingAlternative = true;
      continue;
    }

    const rhMatch = line.match(rhPattern);
    if (rhMatch) {
      turns.push({
        id: `turn-${Date.now()}-${turns.length}`,
        speaker: "rh",
        speakerLabel: rhMatch[1],
        text: rhMatch[2].trim(),
      });
      pendingAlternative = false;
      continue;
    }

    const candidateMatch = line.match(candidatePattern);
    if (candidateMatch) {
      const candidateText = candidateMatch[2].trim();

      if (pendingAlternative && turns.length > 0) {
        // Find previous candidate turn to attach alternative, or attach to the previous turn
        const lastCandidateTurn = [...turns].reverse().find((t) => t.speaker === "candidate");
        if (lastCandidateTurn && !lastCandidateTurn.alternative) {
          lastCandidateTurn.alternative = candidateText;
        } else {
          turns.push({
            id: `turn-${Date.now()}-${turns.length}`,
            speaker: "candidate",
            speakerLabel: candidateMatch[1],
            text: candidateText,
          });
        }
      } else {
        turns.push({
          id: `turn-${Date.now()}-${turns.length}`,
          speaker: "candidate",
          speakerLabel: candidateMatch[1],
          text: candidateText,
        });
      }
      pendingAlternative = false;
      continue;
    }

    // Line without prefix: might be an alternative phrase right after "Ou plus naturellement :"
    if (pendingAlternative && turns.length > 0) {
      const lastTurn = turns[turns.length - 1];
      if (!lastTurn.alternative) {
        lastTurn.alternative = line;
      }
      pendingAlternative = false;
      continue;
    }

    // Otherwise, append note or add to last turn text
    if (turns.length > 0) {
      turns[turns.length - 1].text += " " + line;
    }
  }

  return {
    title: title || "Scénario téléphonique",
    type: "dialogue",
    turns,
    paragraphContent: "",
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

