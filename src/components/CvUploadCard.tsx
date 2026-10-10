"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  UploadCloud,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Paperclip,
} from "lucide-react";
import {
  readStoredCv,
  writeStoredCv,
  removeStoredCv,
  WORKSPACE_CV_EVENT,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";

interface CvUploadCardProps {
  variant?: "compact" | "banner" | "form";
  className?: string;
}

export default function CvUploadCard({
  variant = "compact",
  className,
}: CvUploadCardProps) {
  const [cvData, setCvData] = useState({ base64: "", fileName: "" });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncCv = () => {
      setCvData(readStoredCv());
    };

    syncCv();
    window.addEventListener(WORKSPACE_CV_EVENT, syncCv);
    window.addEventListener("storage", syncCv);

    return () => {
      window.removeEventListener(WORKSPACE_CV_EVENT, syncCv);
      window.removeEventListener("storage", syncCv);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a PDF document (.pdf only).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("The PDF file is too large. Maximum size is 5 MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = () => {
      const base64 = reader.result as string;
      writeStoredCv(base64, file.name);
      setIsUploading(false);
      toast.success(`Resume attached: ${file.name}`);
    };

    reader.onerror = () => {
      setIsUploading(false);
      toast.error("Failed to read the file.");
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeStoredCv();
    toast.info("Resume removed.");
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cvData.base64) return;

    const link = document.createElement("a");
    link.href = cvData.base64;
    link.download = cvData.fileName || "resume.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasCv = Boolean(cvData.base64 && cvData.fileName);

  // Variant 1: Compact (for Sidebar)
  if (variant === "compact") {
    return (
      <div className={cn("p-2 border-t border-gray-100", className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-gray-400">
            Attached Resume (CV)
          </span>
          {hasCv ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              Attached
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Required
            </span>
          )}
        </div>

        {hasCv ? (
          <div className="group flex items-center justify-between rounded-md border border-gray-200 bg-white p-2 text-xs shadow-sm transition hover:border-[#ff5722]/40">
            <div
              className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="Click to replace resume"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-50 text-red-600 font-bold text-[10px]">
                PDF
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-gray-900 group-hover:text-[#ff5722]">
                  {cvData.fileName}
                </p>
                <p className="text-[9.5px] text-gray-400">Click to change</p>
              </div>
            </div>

            <div className="flex items-center gap-1 pl-1 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title="Download attached CV"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Remove attached CV"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50/50 px-3 py-2 text-xs text-gray-600 transition hover:border-[#ff5722] hover:bg-white hover:text-[#ff5722]"
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span className="font-medium">
              {isUploading ? "Uploading..." : "Attach Resume (PDF)"}
            </span>
          </button>
        )}
      </div>
    );
  }

  // Variant 2: Banner (for Upload and Apply pages)
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition",
        hasCv
          ? "border-gray-200 bg-white"
          : "border-amber-200 bg-amber-50/40",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              hasCv ? "bg-red-50 text-red-600" : "bg-amber-100 text-amber-700"
            )}
          >
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-gray-900">
                Candidate Resume Attachment
              </h4>
              {hasCv ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Attached & Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                  <AlertCircle className="h-3 w-3" />
                  No CV Attached
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {hasCv
                ? `Current file: ${cvData.fileName} • Automatically converted to PDF attachment by n8n.`
                : "Attach your resume PDF here so the automation workflow can attach it to cold emails."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasCv ? (
            <>
              <button
                type="button"
                onClick={handleDownload}
                className="editorial-button-secondary h-8 px-3 text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Preview
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="editorial-button-secondary h-8 px-3 text-xs"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Remove resume"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="editorial-button-primary h-8 px-3 text-xs"
            >
              <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
              {isUploading ? "Uploading..." : "Upload Resume (PDF)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
