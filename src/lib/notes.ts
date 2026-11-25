import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";

export type NoteCategory = "reply" | "info" | "idea" | "todo" | "other";

export type NoteColor =
  | "default"
  | "orange"
  | "blue"
  | "emerald"
  | "purple"
  | "amber";

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  color: NoteColor;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotesSyncStatus = "synced" | "local_only" | "offline";

export interface NoteCategoryConfig {
  key: NoteCategory;
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
}

export const NOTE_CATEGORIES: NoteCategoryConfig[] = [
  {
    key: "reply",
    label: "Réponses texte",
    shortLabel: "Réponses",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  {
    key: "info",
    label: "Infos & Liens",
    shortLabel: "Infos",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  {
    key: "idea",
    label: "Idées & Notes",
    shortLabel: "Idées",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
  {
    key: "todo",
    label: "À faire",
    shortLabel: "À faire",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    dotClass: "bg-purple-500",
  },
  {
    key: "other",
    label: "Divers",
    shortLabel: "Divers",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    dotClass: "bg-gray-400",
  },
];

export const NOTE_COLORS: Array<{
  key: NoteColor;
  label: string;
  swatchClass: string;
  cardBorderClass: string;
  editorTintClass: string;
}> = [
  {
    key: "default",
    label: "Neutre",
    swatchClass: "bg-gray-300",
    cardBorderClass: "",
    editorTintClass: "bg-white",
  },
  {
    key: "orange",
    label: "Corail",
    swatchClass: "bg-[#ff5722]",
    cardBorderClass: "border-l-[3px] border-l-[#ff5722]",
    editorTintClass: "bg-gradient-to-b from-orange-50/30 to-white",
  },
  {
    key: "blue",
    label: "Bleu",
    swatchClass: "bg-blue-500",
    cardBorderClass: "border-l-[3px] border-l-blue-500",
    editorTintClass: "bg-gradient-to-b from-blue-50/30 to-white",
  },
  {
    key: "emerald",
    label: "Vert",
    swatchClass: "bg-emerald-500",
    cardBorderClass: "border-l-[3px] border-l-emerald-500",
    editorTintClass: "bg-gradient-to-b from-emerald-50/30 to-white",
  },
  {
    key: "purple",
    label: "Violet",
    swatchClass: "bg-purple-500",
    cardBorderClass: "border-l-[3px] border-l-purple-500",
    editorTintClass: "bg-gradient-to-b from-purple-50/30 to-white",
  },
  {
    key: "amber",
    label: "Ambre",
    swatchClass: "bg-amber-400",
    cardBorderClass: "border-l-[3px] border-l-amber-400",
    editorTintClass: "bg-gradient-to-b from-amber-50/30 to-white",
  },
];

export const NOTES_STORAGE_KEY = "mailpilot_user_notes_v1";
export const NOTES_SEEDED_KEY = "mailpilot_user_notes_seeded_v1";
export const NOTES_SYNC_META_KEY = "mailpilot_user_notes_sync_meta_v1";
export const NOTES_UPDATED_EVENT = "mailpilot_user_notes_updated";

const NOTE_DOC_TYPE = "mailpilot_note";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const nowIso = () => new Date().toISOString();

export function createNoteId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id);
}

export function createStarterNotes(): NoteItem[] {
  const t1 = new Date().toISOString();
  const t2 = new Date(Date.now() - 60_000).toISOString();
  const t3 = new Date(Date.now() - 120_000).toISOString();

  return [
    {
      id: createNoteId(),
      title: "Réponse rapide LinkedIn / WhatsApp (Stage PFE 6 mois)",
      content:
        "Bonjour,\n\nMerci beaucoup pour votre retour ! Je suis bien disponible immédiatement pour un stage PFE de 6 mois.\n\nVoici mon CV et mes liens si besoin, et je reste entièrement disponible pour un court échange téléphonique cette semaine selon vos créneaux.\n\nBien cordialement,",
      category: "reply",
      color: "blue",
      tags: ["LinkedIn", "PFE", "RH"],
      isPinned: true,
      createdAt: t1,
      updatedAt: t1,
    },
    {
      id: createNoteId(),
      title: "Mes liens & informations rapides",
      content:
        "• Durée du stage PFE : 6 mois (à partir de Février / Mars)\n• LinkedIn : https://linkedin.com/in/\n• GitHub : https://github.com/\n• Portfolio : https://\n• Disponibilité entretien : Matin 9h-12h / Après-midi 14h-18h",
      category: "info",
      color: "emerald",
      tags: ["Liens", "Perso", "Profil"],
      isPinned: true,
      createdAt: t2,
      updatedAt: t2,
    },
    {
      id: createNoteId(),
      title: "Relance courte après envoi de candidature",
      content:
        "Bonjour,\n\nJe me permets de revenir vers vous suite à ma candidature envoyée la semaine dernière concernant le stage PFE de 6 mois.\n\nToujours très motivé à l'idée de contribuer à vos projets, je reste à votre disposition pour un premier échange.\n\nCordialement,",
      category: "reply",
      color: "orange",
      tags: ["Relance", "Email"],
      isPinned: false,
      createdAt: t3,
      updatedAt: t3,
    },
  ];
}

interface SyncMeta {
  dirtyIds: string[];
  deletedIds: string[];
}

function readSyncMeta(): SyncMeta {
  if (typeof window === "undefined") return { dirtyIds: [], deletedIds: [] };
  try {
    const raw = localStorage.getItem(NOTES_SYNC_META_KEY);
    if (!raw) return { dirtyIds: [], deletedIds: [] };
    const parsed = JSON.parse(raw) as Partial<SyncMeta>;
    return {
      dirtyIds: Array.isArray(parsed.dirtyIds) ? parsed.dirtyIds : [],
      deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
    };
  } catch {
    return { dirtyIds: [], deletedIds: [] };
  }
}

function writeSyncMeta(meta: SyncMeta): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTES_SYNC_META_KEY, JSON.stringify(meta));
  } catch {}
}

export function markNoteDirty(id: string): void {
  const meta = readSyncMeta();
  const dirty = new Set(meta.dirtyIds);
  dirty.add(id);
  const deleted = meta.deletedIds.filter((d) => d !== id);
  writeSyncMeta({ dirtyIds: Array.from(dirty), deletedIds: deleted });
}

export function markNoteDeleted(id: string): void {
  const meta = readSyncMeta();
  const dirty = meta.dirtyIds.filter((d) => d !== id);
  const deleted = new Set(meta.deletedIds);
  if (isValidUuid(id)) {
    deleted.add(id);
  }
  writeSyncMeta({ dirtyIds: dirty, deletedIds: Array.from(deleted) });
}

export function sortNotes(list: NoteItem[]): NoteItem[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function sanitizeCategory(raw: unknown): NoteCategory {
  const validCategories: NoteCategory[] = ["reply", "info", "idea", "todo", "other"];
  const val = String(raw || "other") as NoteCategory;
  return validCategories.includes(val) ? val : "other";
}

function sanitizeColor(raw: unknown): NoteColor {
  const validColors: NoteColor[] = [
    "default",
    "orange",
    "blue",
    "emerald",
    "purple",
    "amber",
  ];
  const val = String(raw || "default") as NoteColor;
  return validColors.includes(val) ? val : "default";
}

function normalizeNote(raw: unknown): NoteItem | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = isValidUuid(obj.id) ? obj.id : createNoteId();

  return {
    id,
    title: typeof obj.title === "string" ? obj.title : "",
    content: typeof obj.content === "string" ? obj.content : "",
    category: sanitizeCategory(obj.category),
    color: sanitizeColor(obj.color),
    tags: Array.isArray(obj.tags)
      ? obj.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
    isPinned: Boolean(obj.isPinned ?? obj.is_pinned),
    createdAt:
      typeof obj.createdAt === "string"
        ? obj.createdAt
        : typeof obj.created_at === "string"
          ? obj.created_at
          : nowIso(),
    updatedAt:
      typeof obj.updatedAt === "string"
        ? obj.updatedAt
        : typeof obj.updated_at === "string"
          ? obj.updated_at
          : nowIso(),
  };
}

interface NoteDocMeta {
  category?: NoteCategory;
  color?: NoteColor;
  tags?: string[];
  isPinned?: boolean;
  updatedAt?: string;
}

function noteToDocumentRow(note: NoteItem, userId: string) {
  const meta: NoteDocMeta = {
    category: note.category,
    color: note.color,
    tags: note.tags,
    isPinned: note.isPinned,
    updatedAt: note.updatedAt,
  };

  return {
    id: isValidUuid(note.id) ? note.id : createNoteId(),
    user_id: userId,
    application_id: null,
    company_id: null,
    name: note.title,
    doc_type: NOTE_DOC_TYPE,
    url: JSON.stringify(meta),
    notes: note.content,
    created_at: note.createdAt,
  };
}

function documentRowToNote(row: Record<string, unknown>): NoteItem | null {
  if (!isValidUuid(row.id)) return null;

  let meta: NoteDocMeta = {};
  if (typeof row.url === "string" && row.url.trim().startsWith("{")) {
    try {
      meta = JSON.parse(row.url) as NoteDocMeta;
    } catch {
      meta = {};
    }
  }

  const createdAt =
    typeof row.created_at === "string" ? row.created_at : nowIso();

  return {
    id: row.id,
    title: typeof row.name === "string" ? row.name : "",
    content: typeof row.notes === "string" ? row.notes : "",
    category: sanitizeCategory(meta.category),
    color: sanitizeColor(meta.color),
    tags: Array.isArray(meta.tags)
      ? meta.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
    isPinned: Boolean(meta.isPinned),
    createdAt,
    updatedAt:
      typeof meta.updatedAt === "string" && meta.updatedAt
        ? meta.updatedAt
        : createdAt,
  };
}

export function loadLocalNotes(): NoteItem[] {
  if (typeof window === "undefined") {
    return sortNotes(createStarterNotes());
  }

  try {
    const saved = localStorage.getItem(NOTES_STORAGE_KEY);
    const seeded = localStorage.getItem(NOTES_SEEDED_KEY) === "true";

    if (saved === null) {
      if (!seeded) {
        const starters = createStarterNotes();
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(starters));
        localStorage.setItem(NOTES_SEEDED_KEY, "true");
        return sortNotes(starters);
      }
      return [];
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    let migratedIds = false;
    const normalized = parsed
      .map((raw) => {
        const item = normalizeNote(raw);
        if (item && raw && typeof raw === "object" && !isValidUuid((raw as { id?: unknown }).id)) {
          migratedIds = true;
          markNoteDirty(item.id);
        }
        return item;
      })
      .filter((n): n is NoteItem => n !== null);

    if (migratedIds) {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(normalized));
    }

    return sortNotes(normalized);
  } catch (e) {
    console.warn("Error loading local notes:", e);
    return [];
  }
}

export function saveLocalNotes(notes: NoteItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    localStorage.setItem(NOTES_SEEDED_KEY, "true");
    window.dispatchEvent(new Event(NOTES_UPDATED_EVENT));
  } catch (e) {
    console.error("Unable to save local notes:", e);
  }
}

async function resolveUserId(): Promise<string | null> {
  try {
    return await getAuthUserId();
  } catch {
    return null;
  }
}

export async function syncNotesWithSupabase(): Promise<{
  notes: NoteItem[];
  status: NotesSyncStatus;
}> {
  const local = loadLocalNotes();
  const userId = await resolveUserId();

  if (!userId) {
    return { notes: local, status: "local_only" };
  }

  try {
    const meta = readSyncMeta();

    // 1. Replay pending offline deletes on public.documents
    if (meta.deletedIds.length > 0) {
      const validDeletes = meta.deletedIds.filter(isValidUuid);
      if (validDeletes.length > 0) {
        const { error: delErr } = await supabase
          .from("documents")
          .delete()
          .eq("user_id", userId)
          .eq("doc_type", NOTE_DOC_TYPE)
          .in("id", validDeletes);

        if (!delErr) {
          meta.deletedIds = [];
          writeSyncMeta(meta);
        }
      } else {
        meta.deletedIds = [];
        writeSyncMeta(meta);
      }
    }

    // 2. Push any dirty local notes created/edited while offline
    if (meta.dirtyIds.length > 0) {
      const dirtyNotes = local.filter((n) => meta.dirtyIds.includes(n.id));
      if (dirtyNotes.length > 0) {
        const payload = dirtyNotes.map((n) => noteToDocumentRow(n, userId));
        const { error: upsertErr } = await supabase
          .from("documents")
          .upsert(payload, { onConflict: "id" });

        if (!upsertErr) {
          meta.dirtyIds = [];
          writeSyncMeta(meta);
        }
      } else {
        meta.dirtyIds = [];
        writeSyncMeta(meta);
      }
    }

    // 3. Fetch authoritative notes from public.documents (isolated with doc_type + null application_id)
    const { data: remoteRows, error } = await supabase
      .from("documents")
      .select("id, user_id, name, doc_type, url, notes, created_at")
      .eq("user_id", userId)
      .eq("doc_type", NOTE_DOC_TYPE)
      .is("application_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase notes query warning:", error.message);
      return { notes: local, status: "offline" };
    }

    // Seed remote once if empty on server while local has notes
    if ((!remoteRows || remoteRows.length === 0) && local.length > 0) {
      const payload = local.map((n) => noteToDocumentRow(n, userId));
      const { error: seedErr } = await supabase
        .from("documents")
        .upsert(payload, { onConflict: "id" });

      if (seedErr) {
        console.warn("Supabase notes seed warning:", seedErr.message);
        return { notes: local, status: "offline" };
      }

      writeSyncMeta({ dirtyIds: [], deletedIds: [] });
      return { notes: local, status: "synced" };
    }

    const formatted = sortNotes(
      (remoteRows || [])
        .map((r) => documentRowToNote(r as Record<string, unknown>))
        .filter((n): n is NoteItem => n !== null)
    );

    saveLocalNotes(formatted);
    return { notes: formatted, status: "synced" };
  } catch (err) {
    console.warn("Notes sync error:", err);
    return { notes: local, status: "offline" };
  }
}

export async function upsertNoteRemote(note: NoteItem): Promise<NotesSyncStatus> {
  const userId = await resolveUserId();
  if (!userId) return "local_only";

  try {
    const row = noteToDocumentRow(note, userId);
    const { error } = await supabase
      .from("documents")
      .upsert(row, { onConflict: "id" });

    if (error) {
      console.warn("Supabase note upsert warning:", error.message);
      return "offline";
    }

    const meta = readSyncMeta();
    if (meta.dirtyIds.includes(note.id)) {
      writeSyncMeta({
        ...meta,
        dirtyIds: meta.dirtyIds.filter((d) => d !== note.id),
      });
    }
    return "synced";
  } catch {
    return "offline";
  }
}

export async function deleteNoteRemote(noteId: string): Promise<NotesSyncStatus> {
  const userId = await resolveUserId();
  if (!userId) return "local_only";
  if (!isValidUuid(noteId)) return "synced";

  try {
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("user_id", userId)
      .eq("doc_type", NOTE_DOC_TYPE)
      .eq("id", noteId);

    if (error) {
      console.warn("Supabase note delete warning:", error.message);
      return "offline";
    }

    const meta = readSyncMeta();
    if (meta.deletedIds.includes(noteId)) {
      writeSyncMeta({
        ...meta,
        deletedIds: meta.deletedIds.filter((d) => d !== noteId),
      });
    }
    return "synced";
  } catch {
    return "offline";
  }
}

export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi) || [];
  const cleaned = matches
    .map((url) => url.replace(/[.,;:!?)]+$/, ""))
    .filter((url) => url.length > 10);
  return Array.from(new Set(cleaned));
}

export function formatRelativeNoteDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return `Aujourd'hui à ${date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
