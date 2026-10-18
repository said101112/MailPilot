import { APP_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
};

export default function BrandLogo({
  className,
  compact = false,
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0", className)}>
      {/* Modern Email Automation Logo Mark */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ff5722] text-white shadow-xs">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4.5 w-4.5"
        >
          {/* Dynamic Flying Mail / Paper plane & Automation Send */}
          <path d="m22 2-7 20-4-9-9-4Z" fill="white" fillOpacity="0.15" />
          <path d="M22 2 11 13" />
        </svg>
      </div>

      {!compact && (
        <div className="min-w-0">
          <div className="flex items-center leading-tight">
            <span className="text-[1.12rem] font-bold tracking-tight text-gray-900">
              Mail
            </span>
            <span className="text-[1.12rem] font-bold tracking-tight text-[#ff5722]">
              Pilot
            </span>
          </div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            {APP_TAGLINE}
          </p>
        </div>
      )}
    </div>
  );
}
