import {
  Briefcase,
  Building2,
  CalendarClock,
  FileText,
  History as HistoryIcon,
  Home,
  MessageSquarePlus,
  Network,
  Send,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

export type WorkspaceNavItem = {
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export const workspaceNavigationSections: Array<{
  label: string;
  items: WorkspaceNavItem[];
}> = [
  {
    label: "Workspace",
    items: [
      {
        name: "Dashboard",
        href: "/",
        description: "Overview, activity, and workspace shortcuts.",
        icon: Home,
      },
      {
        name: "Manual Apply",
        href: "/apply",
        description: "Create and send one application at a time.",
        icon: Send,
      },
      {
        name: "Bulk Upload",
        href: "/upload",
        description: "Process CSV batches through the automation queue.",
        icon: Upload,
      },
      {
        name: "History",
        href: "/history",
        description: "Review delivery logs and application events.",
        icon: HistoryIcon,
      },
    ],
  },
  {
    label: "Tracker",
    items: [
      {
        name: "Tracker",
        href: "/tracker",
        description: "Job application tracker dashboard and shortcuts.",
        icon: Briefcase,
      },
      {
        name: "Candidatures",
        href: "/tracker/applications",
        description: "Table, Kanban and calendar views of every application.",
        icon: Send,
      },
      {
        name: "Entreprises",
        href: "/tracker/companies",
        description: "Company profiles, logos and application history.",
        icon: Building2,
      },
      {
        name: "Contacts",
        href: "/tracker/contacts",
        description: "Recruiters and contacts linked to each company.",
        icon: Users,
      },
      {
        name: "Entretiens",
        href: "/tracker/interviews",
        description: "Upcoming interviews and past results.",
        icon: CalendarClock,
      },
      {
        name: "Relances",
        href: "/tracker/follow-ups",
        description: "Follow-ups, overdue relances and silent applications.",
        icon: MessageSquarePlus,
      },
    ],
  },
  {
    label: "Setup",
    items: [
      {
        name: "Connections",
        href: "/connections",
        description: "Monitor n8n, Supabase, and email validation health.",
        icon: Network,
      },
      {
        name: "Templates",
        href: "/templates",
        description: "Manage message templates and CSV starter assets.",
        icon: FileText,
      },
    ],
  },
];

export const workspaceNavigation = workspaceNavigationSections.flatMap(
  (section) => section.items,
);

export const searchPlaceholders: Record<string, string> = {
  "/": "Search applications...",
  "/apply": "Search saved jobs...",
  "/upload": "Search bulk jobs...",
  "/history": "Search application log...",
  "/connections": "Search connection health...",
  "/templates": "Search template library...",
  "/tracker": "Search tracker...",
  "/tracker/applications": "Search applications...",
  "/tracker/companies": "Search companies...",
  "/tracker/contacts": "Search contacts...",
  "/tracker/interviews": "Search interviews...",
  "/tracker/follow-ups": "Search follow-ups...",
};
