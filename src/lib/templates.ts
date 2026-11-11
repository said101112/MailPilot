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
    id: "pfe_dev_fr",
    name: "PFE – Développement logiciel, Full Stack & IA",
    subject: "Candidature – Stage PFE de 6 mois en Développement Full Stack, IA & DevOps[chez Company] – Février 2027",
    message:
      "[Greeting]\n\nActuellement élève-ingénieur en cinquième année de Génie Informatique à l’**ENSA Tanger**, je recherche un **stage de fin d’études (PFE) de 6 mois** à partir de **février 2027**. Je serais ravi de rejoindre votre équipe[chez Company] pour contribuer au développement de solutions logicielles fiables et évolutives en **Développement Full Stack, intégration de l’IA et Cloud/DevOps**.\n\nLors de mon stage chez **FOCUS NEXT COMPUTING**, j’ai participé au développement d’une plateforme de gestion clinique en concevant des **microservices Spring Boot** autour des ressources **HL7 FHIR R4** et en contribuant à la sécurisation des accès avec **Keycloak et OPA**. Cette expérience m’a permis de mieux comprendre l’architecture microservices, la sécurité applicative et les exigences liées aux données sensibles.\n\nChez **Smart Automation Technologie**, j’ai contribué à la refonte d’une marketplace avec **Angular**, développé un chatbot de support client basé sur le **RAG** et automatisé des workflows avec **n8n**. J’y ai renforcé mes compétences en développement web, intégration de l’IA et automatisation des processus métiers.\n\nEn parallèle, j’ai développé **NextStep**, une plateforme intelligente de recherche d’emploi intégrant des **agents IA, Docker, AWS et des pipelines CI/CD**. Ma participation à des hackathons, avec une **troisième place au IT Wave & SOLI Hackathon** et une place de **finaliste au Hackathon IDS**, témoigne également de mon goût pour l’innovation et le travail en équipe.\n\nCertifié **Oracle Java SE 17 OCP**, je suis motivé à mettre mes compétences techniques, ma curiosité et ma capacité d’apprentissage au service de vos projets.\n\nVous pouvez également consulter mes réalisations et mon parcours :\n• Portfolio : https://said-nichan-three.vercel.app\n• GitHub : https://github.com/said101112\n• LinkedIn : https://linkedin.com/in/nichan-said-940810313\n\nJe serais ravi d’échanger avec vous lors d’un entretien. Merci d’avance pour votre temps et votre retour.\n\nBien cordialement,\n[MyName]\n+212 713 668 431",
  },
  {
    id: "pfe_dev_en",
    name: "PFE Internship – Software Engineering, Full Stack & AI",
    subject: "Application – 6-Month Final-Year Internship in Full Stack, AI & DevOps[at Company] – February 2027",
    message:
      "[Greeting]\n\nI am a fifth-year Computer Engineering student at **ENSA Tangier**, Morocco, seeking a **6-month final-year internship (PFE)** starting in **February 2027**. I would be excited to join your team[at Company], contribute to meaningful software projects, and further develop my skills in **Full Stack development, AI integration, and Cloud/DevOps**.\n\nDuring my internship at **FOCUS NEXT COMPUTING**, I contributed to a clinical management platform by developing **Spring Boot microservices** around **HL7 FHIR R4** resources and helping secure access using **Keycloak and OPA**. This experience strengthened my understanding of microservices architecture, application security, and sensitive data management.\n\nAt **Smart Automation Technologie**, I contributed to an **Angular** marketplace redesign, developed a **RAG-based** customer support chatbot, and automated workflows using **n8n**. This experience helped me improve my web development skills and understand how AI and automation can address practical business needs.\n\nAlongside these internships, I developed **NextStep**, an intelligent job-search platform integrating **AI agents, Docker, AWS, and CI/CD pipelines**. I also earned **third place at the IT Wave & SOLI Hackathon** and reached the **final of the IDS Hackathon**, experiences that strengthened my problem-solving skills and collaborative mindset.\n\nAs an **Oracle Certified Professional in Java SE 17**, I am motivated to apply my technical skills and adaptability to your team's projects.\n\nYou can also explore my projects and profile:\n• Portfolio: https://said-nichan-three.vercel.app\n• GitHub: https://github.com/said101112\n• LinkedIn: https://linkedin.com/in/nichan-said-940810313\n\nI would welcome the opportunity to discuss my background in a quick call or interview. Thank you for your time and consideration.\n\nKind regards,\n[MyName]\n+212 713 668 431",
  },
  {
    id: "pfe_data_ai_fr",
    name: "PFE – Data Science & Intelligence Artificielle",
    subject: "Candidature – Stage PFE de 6 mois en Data Science & Intelligence Artificielle[chez Company] – Février 2027",
    message:
      "[Greeting]\n\nActuellement élève-ingénieur en cinquième année de Génie Informatique à l’**ENSA Tanger**, avec une orientation en **Data Science et Intelligence Artificielle**, je recherche un **stage PFE de 6 mois** à partir de **février 2027**. Je serais ravi de rejoindre votre équipe[chez Company] afin de contribuer à des projets innovants exploitant les données et l’IA pour répondre à des problématiques concrètes.\n\nLors de mon stage chez **Smart Automation Technologie**, j’ai développé un chatbot de support client basé sur le **RAG** et participé à la refonte d’une marketplace ainsi qu’à l’automatisation de workflows avec **n8n**. Chez **FOCUS NEXT COMPUTING**, j’ai contribué au développement d’une plateforme de gestion clinique reposant sur des **microservices Spring Boot** et les standards **HL7 FHIR R4**, avec une attention particulière portée à la sécurité des données.\n\nMes projets personnels m’ont permis d’approfondir mes compétences en IA et en analyse de données. J’ai notamment réalisé **TrafficSignNet**, un projet de classification d’images par réseaux de neurones convolutifs (**CNN**), et **Predictive Maintenance BI**, portant sur le traitement de données IoT et leur visualisation avec **Power BI**. J’ai également développé **NextStep**, une plateforme intelligente intégrant des **agents IA** pour faciliter la recherche d’emploi et le suivi des candidatures.\n\nEn parallèle, ma **troisième place au IT Wave & SOLI Hackathon** et ma qualification en **finale du Hackathon IDS** témoignent de mon esprit d’innovation et de mon goût pour le travail en équipe.\n\nCurieux, rigoureux et motivé, je souhaite mettre mes compétences au service de vos projets et continuer à progresser au sein de votre équipe.\n\nVous pouvez également consulter mes réalisations et mon profil :\n• Portfolio : https://said-nichan-three.vercel.app\n• GitHub : https://github.com/said101112\n• LinkedIn : https://linkedin.com/in/nichan-said-940810313\n\nJe serais ravi d’échanger avec vous lors d’un entretien. Merci d’avance pour votre temps et votre retour.\n\nBien cordialement,\n[MyName]\n+212 713 668 431",
  },
  {
    id: "pfe_data_ai_en",
    name: "PFE Internship – Data Science & Artificial Intelligence",
    subject: "Application – 6-Month Final-Year Internship in Data Science & AI[at Company] – February 2027",
    message:
      "[Greeting]\n\nI am a fifth-year Computer Engineering student at **ENSA Tangier**, focusing on **Data Science and Artificial Intelligence**. I am seeking a **6-month final-year internship (PFE)** starting in **February 2027** and would welcome the opportunity to join your team[at Company] to contribute to innovative projects using data and AI to solve real-world problems.\n\nDuring my internship at **Smart Automation Technologie**, I developed a **RAG-based** customer support chatbot and contributed to a marketplace redesign and workflow automation using **n8n**. At **FOCUS NEXT COMPUTING**, I contributed to a clinical management platform built with **Spring Boot microservices** and **HL7 FHIR R4** standards, with particular attention to data security.\n\nMy personal projects have strengthened my skills in AI and data analysis. **TrafficSignNet** involved image classification using convolutional neural networks (**CNNs**), while **Predictive Maintenance BI** focused on IoT data processing and visualization with **Power BI**. I also developed **NextStep**, an intelligent platform integrating **AI agents** to support job searching and application tracking.\n\nBeyond my technical work, I earned **third place at the IT Wave & SOLI Hackathon** and reached the **final of the IDS Hackathon**, experiences that strengthened my problem-solving skills and collaborative mindset.\n\nI am eager to apply my skills, continue learning, and contribute to your team's projects.\n\nYou can also explore my projects and profile:\n• Portfolio: https://said-nichan-three.vercel.app\n• GitHub: https://github.com/said101112\n• LinkedIn: https://linkedin.com/in/nichan-said-940810313\n\nI would welcome the opportunity to discuss my background in a quick call or interview. Thank you for your time and consideration.\n\nKind regards,\n[MyName]\n+212 713 668 431",
  },
  {
    id: "followup-7days",
    name: "Relance - Polie & Courte (J+7)",
    subject: "Relance : Candidature [Position][chez Company] - [MyName]",
    message:
      "[Greeting]\n\nJe me permets de revenir vers vous suite à l'envoi de ma candidature la semaine dernière pour le poste de **[Position]**[chez Company].\n\nToujours très enthousiaste à l'idée de rejoindre votre équipe, je serais ravi d'échanger avec vous sur la manière dont mes compétences peuvent répondre à vos besoins.\n\nVous trouverez mon CV en pièce jointe pour rappel.\n\nBien cordialement,\n[MyName]\n+212 713 668 431",
  },
  {
    id: "followup-motivation",
    name: "Relance - Motivation & Disponibilité",
    subject: "Suivi de ma candidature [Position][ - Company]",
    message:
      "[Greeting]\n\nFaisant suite à mon précédent message concernant l'opportunité de **[Position]**[chez Company], je souhaitais vous réitérer mon vif intérêt pour vos projets.\n\nSeriez-vous disponible pour un court échange téléphonique cette semaine afin de faire connaissance ?\n\nExcellente journée,\n[MyName]\n+212 713 668 431",
  },
];

export const TEMPLATE_PLACEHOLDERS = [
  { token: "[Greeting]", description: "Natural salutation (e.g. Bonjour, or Bonjour Sara,)." },
  { token: "[chez Company]", description: "Adds ' chez <Company>' (bold in email body) only for corporate email domains." },
  { token: "[at Company]", description: "Adds ' at <Company>' (bold in email body) only for corporate email domains." },
  { token: "[Company]", description: "Company name detected from domain." },
  { token: "[Position]", description: "Role title or opening name." },
  { token: "[MyName]", description: "Current signed-in profile name." },
  { token: "[Name]", description: "CSV row contact name for batch sends." },
  { token: "**texte**", description: "Displays bold text directly in Gmail/Outlook & Live Preview." },
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

const LEGACY_OBSOLETE_IDS = new Set([
  "pfe-ensa-tanger",
  "pfe-ensa-concise",
  "standard",
  "concise",
  "creative",
]);

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
    let templates = parsed
      .map((item) => normalizeTemplate(item))
      .filter((item): item is MessageTemplate => item !== null)
      .filter((item) => !LEGACY_OBSOLETE_IDS.has(item.id));

    if (templates.length === 0) {
      return cloneDefaultTemplates();
    }

    // Ensure the 4 PFE templates and follow-ups are present
    for (const def of DEFAULT_TEMPLATES) {
      const idx = templates.findIndex((t) => t.id === def.id);
      if (idx === -1) {
        templates.push({ ...def });
      } else {
        // Keep updated default content for default templates
        templates[idx] = { ...def };
      }
    }

    // Sort to keep default templates first
    const defaultIds = DEFAULT_TEMPLATES.map((d) => d.id);
    templates.sort((a, b) => {
      const aIdx = defaultIds.indexOf(a.id);
      const bIdx = defaultIds.indexOf(b.id);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return 0;
    });

    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
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

      // Filter legacy obsolete IDs from remote
      const obsoleteRemoteIds = (remoteRows || [])
        .map((r: any) => String(r.id))
        .filter((id: string) => LEGACY_OBSOLETE_IDS.has(id));

      if (obsoleteRemoteIds.length > 0) {
        void supabase
          .from("user_templates")
          .delete()
          .in("id", obsoleteRemoteIds)
          .eq("user_id", userId);
      }

      const remoteTemplates: MessageTemplate[] = (remoteRows || [])
        .filter((row: any) => !LEGACY_OBSOLETE_IDS.has(String(row.id)))
        .map((row: any) => ({
          id: String(row.id),
          name: String(row.name),
          subject: String(row.subject),
          message: String(row.message),
        }));

      const localTemplates = getLocalTemplatesOnly();
      const remoteMap = new Map(remoteTemplates.map((t) => [t.id, t]));

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

      // 2. Ensure defaults are always present and up to date
      for (const def of DEFAULT_TEMPLATES) {
        const idx = merged.findIndex((t) => t.id === def.id);
        if (idx === -1) {
          merged.push({ ...def });
        } else {
          merged[idx] = { ...def };
        }
      }

      // Upsert default templates in Supabase so mobile and other sessions see them
      const defaultUpserts = DEFAULT_TEMPLATES.map((t) => ({
        id: t.id,
        user_id: userId,
        name: t.name,
        subject: t.subject,
        message: t.message,
        updated_at: new Date().toISOString(),
      }));
      void supabase.from("user_templates").upsert(defaultUpserts);

      // Sort with DEFAULT_TEMPLATES at the top
      const defaultIds = DEFAULT_TEMPLATES.map((d) => d.id);
      merged.sort((a, b) => {
        const aIdx = defaultIds.indexOf(a.id);
        const bIdx = defaultIds.indexOf(b.id);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return 0;
      });

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
