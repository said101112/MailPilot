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

export type NotesSyncStatus = "synced" | "local_only" | "table_missing" | "offline";

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

export const NOTES_SQL_SETUP = `create table if not exists public.user_notes (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  category text not null default 'reply',
  color text not null default 'default',
  tags text[] not null default '{}'::text[],
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.user_notes enable row level security;

create policy "Users can select own notes" on public.user_notes for select using (auth.uid() = user_id);
create policy "Users can insert own notes" on public.user_notes for insert with check (auth.uid() = user_id);
create policy "Users can update own notes" on public.user_notes for update using (auth.uid() = user_id);
create policy "Users can delete own notes" on public.user_notes for delete using (auth.uid() = user_id);`;

const nowIso = () => new Date().toISOString();

export function createStarterNotes(): NoteItem[] {
  const t1 = new Date().toISOString();
  const t2 = new Date(Date.now() - 60_000).toISOString();
  const t3 = new Date(Date.now() - 120_000).toISOString();

  return [
    {
      id: "note-starter-reply-linkedin",
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
      id: "note-starter-links",
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
      id: "note-starter-followup",
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
  deleted.add(id);
  writeSyncMeta({ dirtyIds: dirty, deletedIds: Array.from(deleted) });
}

export function sortNotes(list: NoteItem[]): NoteItem[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function normalizeNote(raw: unknown): NoteItem | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === "string" && obj.id ? obj.id : `note-${Date.now()}`;
  const validCategories: NoteCategory[] = ["reply", "info", "idea", "todo", "other"];
  const validColors: NoteColor[] = ["default", "orange", "blue", "emerald", "purple", "amber"];
  const rawCat = String(obj.category || "other") as NoteCategory;
  const rawColor = String(obj.color || "default") as NoteColor;

  return {
    id,
    title: typeof obj.title === "string" ? obj.title : "",
    content: typeof obj.content === "string" ? obj.content : "",
    category: validCategories.includes(rawCat) ? rawCat : "other",
    color: validColors.includes(rawColor) ? rawColor : "default",
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
    const normalized = parsed
      .map(normalizeNote)
      .filter((n): n is NoteItem => n !== null);
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

function isMissingTableError(errMsg: string | undefined, code?: string): boolean {
  if (!errMsg && !code) return false;
  if (code === "42P01" || code === "PGRST205") return true;
  const lower = (errMsg || "").toLowerCase();
  return (
    lower.includes("user_notes") &&
    (lower.includes("does not exist") ||
      lower.includes("not find the table") ||
      lower.includes("schema cache"))
  );
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

    // 1. Replay offline deletes first
    if (meta.deletedIds.length > 0) {
      const { error: delErr } = await supabase
        .from("user_notes")
        .delete()
        .eq("user_id", userId)
        .in("id", meta.deletedIds);

      if (delErr) {
        if (isMissingTableError(delErr.message, delErr.code)) {
          return { notes: local, status: "table_missing" };
        }
      } else {
        meta.deletedIds = [];
        writeSyncMeta(meta);
      }
    }

    // 2. Push any dirty local notes
    if (meta.dirtyIds.length > 0) {
      const dirtyNotes = local.filter((n) => meta.dirtyIds.includes(n.id));
      if (dirtyNotes.length > 0) {
        const payload = dirtyNotes.map((n) => ({
          id: n.id,
          user_id: userId,
          title: n.title,
          content: n.content,
          category: n.category,
          color: n.color,
          tags: n.tags,
          is_pinned: n.isPinned,
          created_at: n.createdAt,
          updated_at: n.updatedAt,
        }));

        const { error: upsertErr } = await supabase
          .from("user_notes")
          .upsert(payload, { onConflict: "user_id,id" });

        if (upsertErr) {
          if (isMissingTableError(upsertErr.message, upsertErr.code)) {
            return { notes: local, status: "table_missing" };
          }
        } else {
          meta.dirtyIds = [];
          writeSyncMeta(meta);
        }
      } else {
        meta.dirtyIds = [];
        writeSyncMeta(meta);
      }
    }

    // 3. Fetch authoritative remote rows
    const { data: remoteRows, error } = await supabase
      .from("user_notes")
      .select("*")
      .eq("user_id", userId)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error.message, error.code)) {
        return { notes: local, status: "table_missing" };
      }
      return { notes: local, status: "offline" };
    }

    // If remote is empty while local has notes, seed remote once
    if ((!remoteRows || remoteRows.length === 0) && local.length > 0) {
      const payload = local.map((n) => ({
        id: n.id,
        user_id: userId,
        title: n.title,
        content: n.content,
        category: n.category,
        color: n.color,
        tags: n.tags,
        is_pinned: n.isPinned,
        created_at: n.createdAt,
        updated_at: n.updatedAt,
      }));
      await supabase.from("user_notes").upsert(payload, { onConflict: "user_id,id" });
      writeSyncMeta({ dirtyIds: [], deletedIds: [] });
      return { notes: local, status: "synced" };
    }

    const formatted = sortNotes(
      (remoteRows || [])
        .map(normalizeNote)
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
    const { error } = await supabase.from("user_notes").upsert(
      {
        id: note.id,
        user_id: userId,
        title: note.title,
        content: note.content,
        category: note.category,
        color: note.color,
        tags: note.tags,
        is_pinned: note.isPinned,
        created_at: note.createdAt,
        updated_at: note.updatedAt,
      },
      { onConflict: "user_id,id" }
    );

    if (error) {
      if (isMissingTableError(error.message, error.code)) {
        return "table_missing";
      }
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

  try {
    const { error } = await supabase
      .from("user_notes")
      .delete()
      .eq("user_id", userId)
      .eq("id", noteId);

    if (error) {
      if (isMissingTableError(error.message, error.code)) {
        return "table_missing";
      }
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
