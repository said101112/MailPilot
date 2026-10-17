"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditorialSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface EditorialSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly EditorialSelectOption[];
  className?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function EditorialSelect({
  value,
  onChange,
  options,
  className,
  id,
  placeholder,
  disabled,
  ariaLabel,
}: EditorialSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "flex h-full w-full items-center justify-between gap-2 bg-transparent text-left",
          !selected && "text-gray-400",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff5722]/30",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected?.label ?? placeholder ?? "Sélectionner..."}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            aria-label={ariaLabel}
            className="absolute z-50 mt-1 max-h-64 w-full min-w-[11rem] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-[0_12px_24px_rgba(16,24,40,0.12)]"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={option.disabled}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs",
                      isSelected
                        ? "bg-[#fff3ef] font-semibold text-[#ff5722]"
                        : "text-gray-700 hover:bg-gray-50",
                      option.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                    )}
                    onClick={() => {
                      if (option.disabled) return;
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
