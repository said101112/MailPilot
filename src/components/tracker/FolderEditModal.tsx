"use client";

import { useEffect, useState } from "react";
import { Briefcase, Code, Folder, MessageSquare, Mic, Phone, Shield, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ExpressionFolder } from "@/lib/tracker/expressions";

interface FolderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderToEdit?: ExpressionFolder | null;
  onSaveFolder: (folder: ExpressionFolder) => void;
}

const AVAILABLE_ICONS = [
  { key: "phone", label: "Téléphone", icon: Phone },
  { key: "mic", label: "Pitch / Micro", icon: Mic },
  { key: "shield", label: "Bouclier / Négociation", icon: Shield },
  { key: "code", label: "Tech / Code", icon: Code },
  { key: "briefcase", label: "Entreprise", icon: Briefcase },
  { key: "sparkles", label: "Étoiles", icon: Sparkles },
  { key: "message", label: "Message", icon: MessageSquare },
  { key: "folder", label: "Dossier standard", icon: Folder },
];

const AVAILABLE_COLORS = [
  "#ff5722", // Hunter orange
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#475569", // Slate
];

export default function FolderEditModal({
  isOpen,
  onClose,
  folderToEdit,
  onSaveFolder,
}: FolderEditModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("folder");
  const [color, setColor] = useState("#ff5722");

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name);
      setDescription(folderToEdit.description || "");
      setIcon(folderToEdit.icon || "folder");
      setColor(folderToEdit.color || "#ff5722");
    } else {
      setName("");
      setDescription("");
      setIcon("folder");
      setColor("#ff5722");
    }
  }, [folderToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Veuillez renseigner le nom du dossier.");
      return;
    }

    const folder: ExpressionFolder = {
      id: folderToEdit?.id || `folder-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      sortOrder: folderToEdit?.sortOrder ?? 0,
      createdAt: folderToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveFolder(folder);
    toast.success(
      folderToEdit ? `Dossier "${folder.name}" mis à jour !` : `Dossier "${folder.name}" créé !`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-sm font-bold text-gray-900">
            {folderToEdit ? "Modifier le dossier" : "Nouveau dossier thématique"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Nom du dossier :</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: RH Interview - Téléphonique"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 font-medium text-gray-900 focus:border-[#ff5722] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Description (optionnelle) :</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Réponses réflexes pour le premier filtrage téléphonique..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-800 focus:border-[#ff5722] focus:outline-none"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block font-bold text-gray-700 mb-1.5">Icône :</label>
            <div className="grid grid-cols-4 gap-2">
              {AVAILABLE_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setIcon(item.key)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl p-2 border transition cursor-pointer text-[10px]",
                      isSelected
                        ? "border-[#ff5722] bg-orange-50/70 text-[#ff5722] font-bold"
                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block font-bold text-gray-700 mb-1.5">Couleur :</label>
            <div className="flex items-center gap-2">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition cursor-pointer",
                    color === c ? "scale-115 border-gray-900 shadow-xs" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-[#ff5722] px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#f4511e] transition cursor-pointer"
          >
            {folderToEdit ? "Mettre à jour" : "Créer le dossier"}
          </button>
        </div>
      </div>
    </div>
  );
}

