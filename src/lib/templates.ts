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

export function getStoredTemplates() {
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

    return templates.length > 0 ? templates : cloneDefaultTemplates();
  } catch {
    return cloneDefaultTemplates();
  }
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

  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(nextTemplates));
  window.dispatchEvent(new Event(TEMPLATE_LIBRARY_EVENT));
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
