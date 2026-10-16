"use client";

import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function LoadingBlock({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white">
      <Loader2 className="h-6 w-6 animate-spin text-[#ff5722]" />
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 max-w-sm text-xs text-gray-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
