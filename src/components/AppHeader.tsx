"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  CircleHelp,
  LogOut,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { PROFILE_DEFAULT_NAME } from "@/lib/brand";
import { supabase } from "@/lib/supabase";
import {
  WORKSPACE_PROFILE_EVENT,
  readCandidateName,
} from "@/lib/workspace";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/apply": "Manual Apply",
  "/upload": "Bulk Upload",
  "/history": "History",
  "/connections": "Connections",
  "/templates": "Templates",
  "/tracker": "Tracker",
  "/tracker/applications": "Candidatures",
  "/tracker/companies": "Entreprises",
  "/tracker/contacts": "Contacts",
  "/tracker/interviews": "Entretiens",
  "/tracker/follow-ups": "Relances",
};

function resolvePageTitle(pathname: string): string {
  const exact = pageTitles[pathname];
  if (exact) return exact;
  const prefixes = Object.keys(pageTitles)
    .filter((key) => key !== "/")
    .sort((a, b) => b.length - a.length);
  const match = prefixes.find((key) => pathname.startsWith(`${key}/`));
  return match ? pageTitles[match] : "Dashboard";
}

export default function AppHeader() {
  const pathname = usePathname();
  const [candidateName, setCandidateName] = useState(PROFILE_DEFAULT_NAME);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const title = useMemo(() => resolvePageTitle(pathname), [pathname]);

  const initials = useMemo(() => {
    const parts = candidateName.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "S") + (parts[1]?.[0] ?? "N")).toUpperCase();
  }, [candidateName]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const name =
          data.user.user_metadata?.full_name ||
          data.user.email?.split("@")[0] ||
          readCandidateName();
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
        setCandidateName(formattedName);
      } else {
        setCandidateName(readCandidateName());
      }
    };

    void fetchUser();
    window.addEventListener(WORKSPACE_PROFILE_EVENT, fetchUser);
    window.addEventListener("storage", fetchUser);

    return () => {
      window.removeEventListener(WORKSPACE_PROFILE_EVENT, fetchUser);
      window.removeEventListener("storage", fetchUser);
    };
  }, []);

  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="hidden lg:block sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 w-full items-center justify-between px-6">
        {/* Hunter style: Simple clean Page Title */}
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>

        {/* Right actions: Subtle utilities matching Hunter */}
        <div className="flex items-center gap-3">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={() => toast.info("No new notifications.")}
            type="button"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={() => toast.info("Support center is available.")}
            type="button"
            title="Help"
          >
            <CircleHelp className="h-4 w-4" />
          </button>

          {/* User profile dropdown button */}
          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-gray-200"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              type="button"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                {initials}
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {candidateName}
                  </p>
                  <p className="text-[11px] text-gray-500">Free Plan</p>
                </div>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setIsProfileOpen(false);
                    toast.info("Settings coming soon.");
                  }}
                  type="button"
                >
                  <Settings className="h-3.5 w-3.5 text-gray-400" />
                  Settings
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    setIsProfileOpen(false);
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                  }}
                  type="button"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
