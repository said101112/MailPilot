export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
}

export const TEMPLATE_STORAGE_KEY = "truck-app-templates";
export const TEMPLATE_LIBRARY_EVENT = "routepilot-templates-updated";

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "pfe-ensa-tanger",
    name: "Stage PFE - Génie Info (ENSA Tanger)",
    subject: "Candidature Stage PFE [Position] - [MyName] - ENSA Tanger",
    message:
      "Bonjour [Name],\n\nActuellement élève-ingénieur en dernière année de Génie Informatique à l’École Nationale des Sciences Appliquées de Tanger (ENSA Tanger), je suis à la recherche d’un stage de fin d’études (PFE) de 4 à 6 mois à partir de février 2027 en tant que [Position].\n\nOrienté Software Engineering et développement Full Stack, je conçois des architectures applicatives fiables, évolutives et maintenables. Mon socle technique s'articule notamment autour de Java / Spring Boot, JavaScript / TypeScript, React, Node.js, Angular, les architectures microservices, les API REST, ainsi que les technologies Cloud et DevOps (Docker, CI/CD). Je m’intéresse également de près à l’intégration de modèles d’intelligence artificielle pour répondre à des besoins concrets.\n\nÀ travers mes réalisations — notamment le développement de NextStep AI, une plateforme intelligente où j’ai pris en charge la conception backend et l’intégration de fonctionnalités IA —, j’ai développé une solide culture d’ingénierie, un esprit d’analyse rigoureux et une réelle aisance pour le travail collaboratif.\n\nRejoindre [Company] représente pour moi l’opportunité idéale d'apporter ma rigueur technique, de contribuer activement à vos projets à fort impact et de relever des défis stimulants au sein de vos équipes.\n\nVous trouverez mon CV en pièce jointe. Vous pouvez également consulter mes projets et mon parcours via mes liens :\n• Portfolio : https://said-nichan-three.vercel.app\n• GitHub : https://github.com/said101112\n• LinkedIn : https://linkedin.com/in/nichan-said-940810313\n\nJe serais ravi de pouvoir échanger avec vous lors d'un entretien afin de vous détailler mon parcours, ma motivation et la valeur que je peux apporter à [Company].\n\nJe vous remercie vivement pour votre attention et vous souhaite une excellente journée.\n\nBien cordialement,\n[MyName]",
  },
  {
    id: "pfe-ensa-concise",
    name: "Stage PFE - Version Directe (ENSA)",
    subject: "Candidature [Position] chez [Company] - [MyName]",
    message:
      "Bonjour [Name],\n\nÉlève-ingénieur en dernière année de Génie Informatique à l’ENSA Tanger, je recherche un stage de fin d'études (PFE) de 4 à 6 mois dès février 2027 en tant que [Position].\n\nSpécialisé en Software Engineering et Full Stack (Java/Spring Boot, TypeScript/React/Node, Cloud/DevOps & IA), j'ai développé des projets complets à l'image de NextStep AI (plateforme d'accompagnement intelligent).\n\nTrès motivé par les projets de [Company], je serais ravi de mettre ma rigueur et ma passion du code au service de vos défis.\n\nMon CV est joint à ce message, et mes réalisations sont accessibles ici :\n• Portfolio : https://said-nichan-three.vercel.app\n• GitHub : https://github.com/said101112\n• LinkedIn : https://linkedin.com/in/nichan-said-940810313\n\nDisponible pour un échange selon vos convenances, je vous remercie pour votre considération.\n\nBien cordialement,\n[MyName]",
  },
  {
    id: "standard",
    name: "Standard",
    subject: "Application for [Position] at [Company]",
    message:
      "Hello Hiring Manager,\n\nI am writing to express my interest in the [Position] role at [Company]. With strong experience in logistics, dispatch support, and operational coordination, I can contribute quickly and reliably to your team.\n\nMy background aligns with the requirements outlined in the role, and I would welcome the opportunity to discuss how I can support your operations.\n\nSincerely,\n[MyName]",
  },
  {
    id: "concise",
    name: "Concise",
    subject: "Application for [Position] at [Company]",
    message:
      "Hello Hiring Manager,\n\nI am interested in the [Position] opportunity at [Company]. My logistics and fleet support experience would allow me to add value quickly.\n\nThank you for your consideration.\n\nSincerely,\n[MyName]",
  },
  {
    id: "creative",
    name: "Creative",
    subject: "[Position] application for [Company]",
    message:
      "Hello Hiring Manager,\n\nI am excited by the [Position] opening at [Company]. I bring a practical mix of transportation operations, structured execution, and process improvement that fits fast-moving logistics teams.\n\nI would be glad to discuss how I can help strengthen day-to-day fleet performance and coordination.\n\nSincerely,\n[MyName]",
  },
  {
    id: "followup-7days",
    name: "Relance - Polie & Courte (J+7)",
    subject: "Relance : Candidature [Position] chez [Company] - [MyName]",
    message:
      "Bonjour [Name],\n\nJe me permets de revenir vers vous suite à l'envoi de ma candidature la semaine dernière pour le poste de [Position] au sein de votre entreprise [Company].\n\nToujours très enthousiaste à l'idée d'intégrer votre équipe, je serais ravi(e) d'échanger avec vous sur la manière dont mes compétences peuvent répondre à vos besoins.\n\nVous trouverez mon CV en pièce jointe pour rappel.\n\nRestant à votre entière disposition,\n\nBien cordialement,\n[MyName]",
  },
  {
    id: "followup-motivation",
    name: "Relance - Motivation & Disponibilité",
    subject: "Suivi de ma candidature [Position] - [Company]",
    message:
      "Bonjour [Name],\n\nJ'espère que vous allez bien. Faisant suite à mon message de la semaine passée concernant l'opportunité [Position] chez [Company], je souhaitais vous réitérer mon vif intérêt pour ce poste.\n\nSeriez-vous disponible pour un court échange téléphonique cette semaine afin de faire connaissance ?\n\nExcellente journée,\n[MyName]",
  },
];

export const TEMPLATE_PLACEHOLDERS = [
  { token: "[Company]", description: "Company or carrier name." },
  { token: "[Position]", description: "Role title or opening name." },
  { token: "[MyName]", description: "Current signed-in profile name." },
  { token: "[Name]", description: "CSV row contact name for batch sends." },
];

function cloneTemplates(templates: MessageTemplate[]) {
  return templates.map((template) => ({ ...template }));
}

export function cloneDefaultTemplates() {
  return cloneTemplates(DEFAULT_TEMPLATES);
}

function normalizeTemplate(value: unknown): MessageTemplate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const template = value as Partial<MessageTemplate>;

  if (!template.id || !template.name || !template.subject || !template.message) {
    return null;
  }

  return {
    id: String(template.id),
    name: String(template.name),
    subject: String(template.subject),
    message: String(template.message),
  };
}

import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";

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

function getLocalTemplatesOnly(): MessageTemplate[] {
  if (typeof window === "undefined") {
    return cloneDefaultTemplates();
  }

  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!saved) {
      return cloneDefaultTemplates();
    }

    const parsed = JSON.parse(saved) as unknown[];
    const templates = parsed
      .map((item) => normalizeTemplate(item))
      .filter((item): item is MessageTemplate => item !== null);

    if (templates.length === 0) {
      return cloneDefaultTemplates();
    }

    // Ensure default follow-up templates are available
    for (const def of DEFAULT_TEMPLATES) {
      if (!templates.some((t) => t.id === def.id)) {
        templates.push({ ...def });
      }
    }

    return templates;
  } catch {
    return cloneDefaultTemplates();
  }
}

export function getStoredTemplates(): MessageTemplate[] {
  return getLocalTemplatesOnly();
}

let syncInFlight: Promise<MessageTemplate[]> | null = null;

export async function syncTemplatesFromSupabase(): Promise<MessageTemplate[]> {
  if (typeof window === "undefined") {
    return cloneDefaultTemplates();
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      const userId = await resolveUserId();
      if (!userId) {
        return getLocalTemplatesOnly();
      }

      const { data: remoteRows, error } = await supabase
        .from("user_templates")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Supabase templates query error:", error.message);
        return getLocalTemplatesOnly();
      }

      const remoteTemplates: MessageTemplate[] = (remoteRows || []).map((row: any) => ({
        id: String(row.id),
        name: String(row.name),
        subject: String(row.subject),
        message: String(row.message),
      }));

      const localTemplates = getLocalTemplatesOnly();
      const remoteMap = new Map(remoteTemplates.map((t) => [t.id, t]));
      const localMap = new Map(localTemplates.map((t) => [t.id, t]));

      const merged: MessageTemplate[] = [...remoteTemplates];

      // Bidirectional sync:
      // 1. Any local template that is missing in Supabase -> upload to Supabase!
      const missingInRemote = localTemplates.filter((t) => !remoteMap.has(t.id));
      if (missingInRemote.length > 0) {
        const toUpsert = missingInRemote.map((t) => ({
          id: t.id,
          user_id: userId,
          name: t.name,
          subject: t.subject,
          message: t.message,
          updated_at: new Date().toISOString(),
        }));
        const { error: upsertErr } = await supabase.from("user_templates").upsert(toUpsert);
        if (upsertErr) {
          console.warn("Supabase templates initial upload warning:", upsertErr.message);
        }
        for (const m of missingInRemote) {
          merged.push(m);
        }
      }

      // 2. Ensure defaults are always present
      for (const def of DEFAULT_TEMPLATES) {
        if (!merged.some((t) => t.id === def.id)) {
          merged.push({ ...def });
        }
      }

      // 3. Save merged list locally and notify listeners
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new Event(TEMPLATE_LIBRARY_EVENT));

      return merged;
    } catch (err) {
      console.warn("Supabase templates sync error:", err);
      return getLocalTemplatesOnly();
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

export function saveStoredTemplates(templates: MessageTemplate[]) {
  if (typeof window === "undefined") {
    return;
  }

  const sanitized =
    templates
      .map((item) => normalizeTemplate(item))
      .filter((item): item is MessageTemplate => item !== null) || [];

  const nextTemplates =
    sanitized.length > 0 ? sanitized : cloneDefaultTemplates();

  // 1. Instant local persistence
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(nextTemplates));
  window.dispatchEvent(new Event(TEMPLATE_LIBRARY_EVENT));

  // 2. Direct automatic save to Supabase Cloud
  void (async () => {
    try {
      const userId = await resolveUserId();
      if (!userId) return;

      // Fetch remote IDs to delete any templates that were removed locally
      const { data: remoteRows, error: fetchErr } = await supabase
        .from("user_templates")
        .select("id")
        .eq("user_id", userId);

      if (fetchErr) {
        return;
      }

      const remoteIds = new Set((remoteRows || []).map((r: any) => String(r.id)));
      const currentIds = new Set(nextTemplates.map((t) => t.id));

      const toDelete = Array.from(remoteIds).filter((id) => !currentIds.has(id));
      if (toDelete.length > 0) {
        await supabase
          .from("user_templates")
          .delete()
          .in("id", toDelete)
          .eq("user_id", userId);
      }

      // Upsert all current templates
      const toUpsert = nextTemplates.map((t) => ({
        id: t.id,
        user_id: userId,
        name: t.name,
        subject: t.subject,
        message: t.message,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("user_templates").upsert(toUpsert);
    } catch (err) {
      console.warn("Supabase template save warning:", err);
    }
  })();
}

// Auto-sync on browser load
if (typeof window !== "undefined") {
  void syncTemplatesFromSupabase();
}

export function createBlankTemplate(index: number): MessageTemplate {
  return {
    id: `custom-${Date.now()}`,
    name: `Custom ${index}`,
    subject: "Application for [Position] at [Company]",
    message:
      "Hello Hiring Manager,\n\nI would like to apply for the [Position] opportunity at [Company].\n\nSincerely,\n[MyName]",
  };
}
