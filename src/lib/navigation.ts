import {
  FileText,
  History as HistoryIcon,
  Home,
  Network,
  Send,
  Upload,
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
};
