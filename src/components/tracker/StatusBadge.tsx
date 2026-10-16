"use client";

import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS, JOB_STATUS_TONES, type JobStatus } from "@/lib/tracker/constants";

export default function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status as JobStatus;
  const label = JOB_STATUS_LABELS[key] ?? status;
  const tone = JOB_STATUS_TONES[key] ?? "bg-gray-100 text-gray-600";

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-medium",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
