"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageSquarePlus,
  Network,
  Send,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import CvUploadCard from "@/components/CvUploadCard";
import { PROFILE_DEFAULT_NAME } from "@/lib/brand";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_PROFILE_EVENT,
  WORKSPACE_SIDEBAR_EVENT,
  readCandidateName,
  readSidebarCollapsed,
  toggleSidebarCollapsed,
} from "@/lib/workspace";

const hunterNavSections = [
  {
    label: null,
    items: [
      {
        name: "Dashboard",
        href: "/",
        icon: Home,
      },
    ],
  },
  {
    label: "Discover",
    items: [
      {
        name: "Manual Apply",
        href: "/apply",
        icon: Send,
      },
      {
        name: "Bulk Upload",
        href: "/upload",
        icon: Upload,
      },
    ],
  },
  {
    label: "Tracker",
    items: [
      {
        name: "Tracker",
        href: "/tracker",
        icon: Briefcase,
      },
      {
        name: "Candidatures",
        href: "/tracker/applications",
        icon: Send,
      },
      {
        name: "Entreprises",
        href: "/tracker/companies",
        icon: Building2,
      },
      {
        name: "Contacts",
        href: "/tracker/contacts",
        icon: Users,
      },
      {
        name: "Entretiens",
        href: "/tracker/interviews",
        icon: CalendarClock,
      },
      {
        name: "Relances",
        href: "/tracker/follow-ups",
        icon: MessageSquarePlus,
      },
    ],
  },
  {
    label: "Finder",
    items: [
      {
        name: "History",
        href: "/history",
        icon: Clock,
      },
      {
        name: "Connections",
        href: "/connections",
        icon: Network,
      },
      {
        name: "Templates",
        href: "/templates",
        icon: FileText,
      },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [candidateName, setCandidateName] = useState(PROFILE_DEFAULT_NAME);

  useEffect(() => {
    const syncSidebar = () => setIsCollapsed(readSidebarCollapsed());
    const syncProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        let name = data.user.user_metadata?.full_name;
        if (!name) {
          const local = (data.user.email?.split("@")[0] || "").toLowerCase();
          if (local.includes("nichan") || local.includes("said")) {
            name = "Said Nichan";
          } else {
            name = readCandidateName();
          }
        }
        setCandidateName(name);
      } else {
        setCandidateName(readCandidateName());
      }
    };

    syncSidebar();
    void syncProfile();

    window.addEventListener(WORKSPACE_SIDEBAR_EVENT, syncSidebar);
    window.addEventListener(WORKSPACE_PROFILE_EVENT, syncProfile);
    window.addEventListener("storage", syncSidebar);
    window.addEventListener("storage", syncProfile);

    return () => {
      window.removeEventListener(WORKSPACE_SIDEBAR_EVENT, syncSidebar);
      window.removeEventListener(WORKSPACE_PROFILE_EVENT, syncProfile);
      window.removeEventListener("storage", syncSidebar);
      window.removeEventListener("storage", syncProfile);
    };
  }, []);

  const initials =
    candidateName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SN";

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Unable to sign out right now.");
      return;
    }

    toast.success("Logged out.");
    router.push("/login");
  };

  if (pathname === "/login") {
    return null;
  }

  const navLinkClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
      isActive
        ? "bg-gray-100 text-gray-900 font-semibold"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      isCollapsed && "justify-center px-0",
    );

  const isActivePath = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile Top Navbar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 w-full max-w-full items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-4 lg:hidden">
        <BrandLogo />
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100"
          onClick={() => setMobileOpen((value) => !value)}
          type="button"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 max-w-[80vw] flex-col border-r border-gray-200 bg-white px-3 pb-4 pt-4 transition-transform duration-200 lg:hidden shadow-xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <BrandLogo />
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
            onClick={() => setMobileOpen(false)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
          {hunterNavSections.map((section, idx) => (
            <div key={idx}>
              {section.label && (
                <p className="px-3 text-[11px] font-medium text-gray-400">
                  {section.label}
                </p>
              )}
              <nav className="mt-1 flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const isActive = isActivePath(item.href);
                  return (
                    <Link
                      key={item.name}
                      className={navLinkClass(isActive)}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-gray-500" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="px-1 py-1">
          <CvUploadCard variant="compact" />
        </div>

        <div className="mt-auto border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-gray-900">
                  {candidateName}
                </p>
                <p className="text-[10px] text-gray-400">Free Plan</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-700"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Persistent Sidebar (Hunter.io exact style) */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-gray-200 bg-white transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col",
          isCollapsed ? "w-16" : "w-56",
        )}
      >
        {/* Logo area */}
        <div className={cn("px-4 pt-4 pb-4", isCollapsed && "px-2")}>
          <div className="flex items-center justify-between">
            <Link href="/" title="MailPilot">
              <BrandLogo compact={isCollapsed} />
            </Link>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="space-y-4">
            {hunterNavSections.map((section, idx) => (
              <div key={idx}>
                {section.label && !isCollapsed && (
                  <p className="px-3 text-[11px] font-medium text-gray-400">
                    {section.label}
                  </p>
                )}
                <nav className="mt-1 flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const isActive = isActivePath(item.href);
                  return (
                    <Link
                      key={item.name}
                      className={navLinkClass(isActive)}
                      href={item.href}
                      title={item.name}
                    >
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-gray-900" : "text-gray-500",
                          )}
                        />
                        {!isCollapsed && <span>{item.name}</span>}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Attached Resume (CV) Card */}
        {!isCollapsed && <CvUploadCard variant="compact" />}

        {/* Bottom User Bar (Hunter.io exact bottom left) */}
        <div className="border-t border-gray-200 p-2.5">
          {!isCollapsed ? (
            <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-50">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-gray-900">
                    {candidateName}
                  </p>
                  <p className="text-[10px] text-gray-400">Free Plan</p>
                </div>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={handleLogout}
                title="Sign out"
                type="button"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700"
                title={candidateName}
              >
                {initials}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
