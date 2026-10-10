"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  cloneDefaultTemplates,
  DEFAULT_TEMPLATES,
  TEMPLATE_LIBRARY_EVENT,
  getStoredTemplates,
  saveStoredTemplates,
  type MessageTemplate,
} from "@/lib/templates";

function cloneDefaults() {
  return DEFAULT_TEMPLATES.map((template) => ({ ...template }));
}

function createTemplateDraft() {
  return {
    name: "",
    subject: "Application for [Position] at [Company]",
    message:
      "Hello Hiring Manager,\n\nI would like to apply for the [Position] opportunity at [Company].\n\nSincerely,\n[MyName]",
  };
}

function buildNewTemplate(draft: {
  name: string;
  subject: string;
  message: string;
}): MessageTemplate {
  return {
    id: `custom-${Date.now()}`,
    name: draft.name.trim(),
    subject: draft.subject.trim(),
    message: draft.message.trim(),
  };
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>(cloneDefaultTemplates);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState(createTemplateDraft);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(templates.length / ITEMS_PER_PAGE);
  const paginatedTemplates = templates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    const syncTemplates = () => {
      const nextTemplates = getStoredTemplates();
      setTemplates(nextTemplates);
    };

    syncTemplates();

    window.addEventListener(TEMPLATE_LIBRARY_EVENT, syncTemplates);
    window.addEventListener("storage", syncTemplates);

    return () => {
      window.removeEventListener(TEMPLATE_LIBRARY_EVENT, syncTemplates);
      window.removeEventListener("storage", syncTemplates);
    };
  }, []);



  const handleCreateTemplate = () => {
    if (
      !createDraft.name.trim() ||
      !createDraft.subject.trim() ||
      !createDraft.message.trim()
    ) {
      toast.error("Fill in the name, subject, and message before saving.");
      return;
    }

    const nextTemplate = buildNewTemplate(createDraft);
    const nextTemplates = [nextTemplate, ...templates];
    setTemplates(nextTemplates);
    saveStoredTemplates(nextTemplates);
    setCreateDraft(createTemplateDraft());
    setIsCreateOpen(false);
    toast.success("Template added to the library.");
  };

  const handleSaveEdit = () => {
    if (!editingTemplate) return;

    if (
      !editingTemplate.name.trim() ||
      !editingTemplate.subject.trim() ||
      !editingTemplate.message.trim()
    ) {
      toast.error("Template name, subject, and message are required.");
      return;
    }

    const sanitizedTemplates = templates.map((template) =>
      template.id === editingTemplate.id
        ? {
            ...editingTemplate,
            name: editingTemplate.name.trim(),
            subject: editingTemplate.subject.trim(),
            message: editingTemplate.message.trim(),
          }
        : template,
    );

    setTemplates(sanitizedTemplates);
    saveStoredTemplates(sanitizedTemplates);
    setEditingTemplate(null);
    toast.success("Template saved.");
  };

  const handleDeleteTemplate = (id: string) => {
    if (templates.length === 1) {
      toast.error("Keep at least one template in the library.");
      return;
    }

    const nextTemplates = templates.filter((template) => template.id !== id);
    setTemplates(nextTemplates);
    saveStoredTemplates(nextTemplates);
    toast.success("Template removed.");
  };

  const handleRestoreDefaults = () => {
    const defaults = cloneDefaults();
    setTemplates(defaults);
    saveStoredTemplates(defaults);
    toast.success("Default templates restored.");
  };

  return (
    <>
      <div className="page-shell">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Template Library
              </h1>
              <p className="mt-1 text-xs text-gray-500">
                A clean library of saved outreach templates shared by Manual Apply and Bulk Upload.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="editorial-button-secondary h-8 px-3 text-xs"
                onClick={handleRestoreDefaults}
                type="button"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore Defaults
              </button>
              <button
                className="editorial-button-primary h-8 px-3 text-xs"
                onClick={() => setIsCreateOpen(true)}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Template
              </button>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {paginatedTemplates.map((template) => (
              <div key={template.id} className="editorial-card p-5 flex flex-col">
                <div className="flex-1 min-w-0 mb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-[var(--editorial-text)] truncate text-[1.05rem]">{template.name}</h3>
                    <span className="editorial-chip editorial-chip-success shrink-0">SAVED</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[13px] font-semibold text-[var(--editorial-text)] truncate">
                      {template.subject}
                    </p>
                    <p className="text-[13px] leading-relaxed text-[var(--editorial-text-soft)] line-clamp-3">
                      {template.message}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 border-t border-[var(--editorial-border)] pt-4 mt-auto">
                  <button 
                    className="editorial-button-secondary flex items-center justify-center gap-2 flex-1 h-9 text-[13px]" 
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  <button 
                    className="editorial-button-primary flex items-center justify-center gap-2 flex-1 h-9 text-[13px]" 
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button 
                    className="editorial-button-secondary flex shrink-0 items-center justify-center h-9 w-9 text-[var(--editorial-danger)] hover:border-[#f4b3ae] hover:bg-[var(--editorial-danger-soft)] transition-colors" 
                    onClick={() => handleDeleteTemplate(template.id)}
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--editorial-border)] pt-5">
              <p className="text-sm text-[var(--editorial-text-soft)]">
                Showing <span className="font-semibold text-[var(--editorial-text)]">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-semibold text-[var(--editorial-text)]">{Math.min(currentPage * ITEMS_PER_PAGE, templates.length)}</span> of <span className="font-semibold text-[var(--editorial-text)]">{templates.length}</span> templates
              </p>
              <div className="flex gap-2">
                <button
                  className="editorial-button-secondary h-9 px-3 text-sm disabled:opacity-50"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center justify-center min-w-[32px] text-sm font-medium">
                  {currentPage} / {totalPages}
                </div>
                <button
                  className="editorial-button-secondary h-9 px-3 text-sm disabled:opacity-50"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(9,12,16,0.58)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-[680px] rounded-[18px] border border-[var(--editorial-border)] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between border-b border-[var(--editorial-border)] px-5 py-4 sm:px-6">
              <div>
                <p className="editorial-label uppercase tracking-widest text-xs font-bold text-slate-400">NEW TEMPLATE</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--editorial-text)]">
                  Add a saved template
                </h2>
              </div>
              <button
                className="editorial-icon-button"
                onClick={() => {
                  setCreateDraft(createTemplateDraft());
                  setIsCreateOpen(false);
                }}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <label className="editorial-label uppercase tracking-widest text-xs font-bold text-slate-400">TEMPLATE NAME</label>
                <input
                  className="editorial-input"
                  onChange={(event) =>
                    setCreateDraft((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Fleet Intro"
                  value={createDraft.name}
                />
              </div>

              <div className="space-y-2">
                <label className="editorial-label uppercase tracking-widest text-xs font-bold text-slate-400">SUBJECT</label>
                <input
                  className="editorial-input"
                  onChange={(event) =>
                    setCreateDraft((previous) => ({
                      ...previous,
                      subject: event.target.value,
                    }))
                  }
                  value={createDraft.subject}
                />
              </div>

              <div className="space-y-2">
                <label className="editorial-label uppercase tracking-widest text-xs font-bold text-slate-400">MESSAGE</label>
                <textarea
                  className="editorial-textarea min-h-[240px]"
                  onChange={(event) =>
                    setCreateDraft((previous) => ({
                      ...previous,
                      message: event.target.value,
                    }))
                  }
                  value={createDraft.message}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--editorial-border)] px-5 py-4 bg-[#f8fafc] sm:flex-row sm:justify-end sm:px-6 rounded-b-[18px]">
              <button
                className="editorial-button-secondary h-10 px-4 text-sm bg-white"
                onClick={() => {
                  setCreateDraft(createTemplateDraft());
                  setIsCreateOpen(false);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="editorial-button-primary h-10 px-4 text-sm"
                onClick={handleCreateTemplate}
                type="button"
              >
                <Save className="h-4 w-4 mr-2 inline" />
                Save New Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTemplate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(9,12,16,0.58)] p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-[680px] flex-col max-h-[90vh] rounded-[18px] border border-[var(--editorial-border)] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--editorial-border)] px-5 py-4 sm:px-6">
              <div>
                <p className="editorial-label uppercase tracking-widest text-xs font-bold text-slate-400">EDIT TEMPLATE</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--editorial-text)]">
                  {editingTemplate.name}
                </h2>
              </div>
              <button
                className="editorial-icon-button"
                onClick={() => setEditingTemplate(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <label className="editorial-label uppercase tracking-widest text-xs font-bold text-slate-400">TEMPLATE NAME</label>
                <input
                  className="editorial-input"
                  onChange={(event) =>
                    setEditingTemplate((prev) => prev ? { ...prev, name: event.target.value } : null)
                  }
                  value={editingTemplate.name}
                />
              </div>

              <div className="space-y-2">
                <label className="editorial-label uppercase tracking-widest text-xs font-bold text-slate-400">SUBJECT</label>
                <input
                  className="editorial-input"
                  onChange={(event) =>
                    setEditingTemplate((prev) => prev ? { ...prev, subject: event.target.value } : null)
                  }
                  value={editingTemplate.subject}
                />
              </div>

              <div className="space-y-2">
                <label className="editorial-label uppercase tracking-widest text-xs font-bold text-slate-400">MESSAGE</label>
                <textarea
                  className="editorial-textarea min-h-[240px]"
                  onChange={(event) =>
                    setEditingTemplate((prev) => prev ? { ...prev, message: event.target.value } : null)
                  }
                  value={editingTemplate.message}
                />
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--editorial-border)] px-5 py-4 bg-[#f8fafc] sm:flex-row sm:justify-between sm:px-6 rounded-b-[18px]">
              <p className="text-xs text-[var(--editorial-text-soft)] max-w-[280px] leading-relaxed">
                Variables: <strong>[Company]</strong>, <strong>[Position]</strong>, <strong>[MyName]</strong>.
              </p>
              <div className="flex items-center gap-3">
                <button
                  className="editorial-button-secondary h-10 px-4 text-sm bg-white"
                  onClick={() => setEditingTemplate(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="editorial-button-primary h-10 px-4 text-sm"
                  onClick={handleSaveEdit}
                  type="button"
                >
                  <Save className="h-4 w-4 mr-2 inline" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(9,12,16,0.58)] p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-[600px] flex-col max-h-[90vh] rounded-[18px] border border-[var(--editorial-border)] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--editorial-border)] px-5 py-4 sm:px-6">
              <div>
                <p className="editorial-label uppercase tracking-widest text-xs font-bold text-slate-400">PREVIEW TEMPLATE</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--editorial-text)]">
                  {previewTemplate.name}
                </h2>
              </div>
              <button
                className="editorial-icon-button"
                onClick={() => setPreviewTemplate(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="shrink-0 px-5 py-5 sm:px-6 bg-[#f8fbff] border-b border-[var(--editorial-border)]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--editorial-text-faint)] mb-1">Subject</p>
              <p className="text-[14px] font-semibold text-[var(--editorial-text)]">{previewTemplate.subject}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--editorial-text-faint)] mb-3">Message Body</p>
              <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--editorial-text)] bg-white">
                {previewTemplate.message}
              </div>
            </div>

            <div className="flex shrink-0 border-t border-[var(--editorial-border)] px-5 py-4 bg-[#f8fafc] justify-end sm:px-6 rounded-b-[18px]">
              <button
                className="editorial-button-secondary h-10 px-6 text-sm bg-white"
                onClick={() => setPreviewTemplate(null)}
                type="button"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
