import { jsPDF } from "jspdf";
import { readCandidateName } from "./workspace";

export interface CoverLetterOptions {
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateCity?: string;
  candidateTitle?: string;
  company: string;
  position: string;
  contactName?: string;
  dateStr?: string;
  subject?: string;
  body: string;
}

const STORAGE_KEY_PHONE = "truck-app-candidate-phone";
const STORAGE_KEY_EMAIL = "truck-app-candidate-email";
const STORAGE_KEY_CITY = "truck-app-candidate-city";
const STORAGE_KEY_TITLE = "truck-app-candidate-title";

export function getStoredCandidateProfile() {
  if (typeof window === "undefined") {
    return {
      name: "Said Nichan",
      email: "",
      phone: "",
      city: "",
      title: "Élève Ingénieur / Data & IA",
    };
  }

  return {
    name: readCandidateName() || "Said Nichan",
    email: localStorage.getItem(STORAGE_KEY_EMAIL) || "",
    phone: localStorage.getItem(STORAGE_KEY_PHONE) || "",
    city: localStorage.getItem(STORAGE_KEY_CITY) || "",
    title: localStorage.getItem(STORAGE_KEY_TITLE) || "Élève Ingénieur / Data & IA",
  };
}

export function saveStoredCandidateProfile(profile: {
  email?: string;
  phone?: string;
  city?: string;
  title?: string;
}) {
  if (typeof window === "undefined") return;
  if (profile.email !== undefined) localStorage.setItem(STORAGE_KEY_EMAIL, profile.email);
  if (profile.phone !== undefined) localStorage.setItem(STORAGE_KEY_PHONE, profile.phone);
  if (profile.city !== undefined) localStorage.setItem(STORAGE_KEY_CITY, profile.city);
  if (profile.title !== undefined) localStorage.setItem(STORAGE_KEY_TITLE, profile.title);
}

function formatDateFrench(d: Date = new Date()): string {
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function generateCoverLetterPdf(opts: CoverLetterOptions) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const profile = getStoredCandidateProfile();
  const name = opts.candidateName || profile.name || "Said Nichan";
  const email = opts.candidateEmail || profile.email || "";
  const phone = opts.candidatePhone || profile.phone || "";
  const city = opts.candidateCity || profile.city || "";
  const title = opts.candidateTitle || profile.title || "";

  const company = opts.company || "L'Entreprise";
  const position = opts.position || "Stage / Emploi";
  const dateFormatted = opts.dateStr || `Le ${formatDateFrench()}`;

  const leftMargin = 22;
  const pageWidth = 210;
  const contentWidth = 166; // 210 - 22 * 2

  // 1. En-tête Candidat (Haut Gauche)
  let y = 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(name, leftMargin, y);

  if (title) {
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(37, 99, 235); // royal-blue
    doc.text(title, leftMargin, y);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500

  const contactPieces = [email, phone, city].filter(Boolean);
  if (contactPieces.length > 0) {
    y += 4.5;
    doc.text(contactPieces.join("  •  "), leftMargin, y);
  }

  // 2. Destinataire & Date (Haut Droite)
  const rightX = pageWidth - leftMargin;
  let rightY = 32;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("À l'attention du service Recrutement", rightX, rightY, { align: "right" });

  rightY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(company, rightX, rightY, { align: "right" });

  rightY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(dateFormatted, rightX, rightY, { align: "right" });

  // 3. Filet séparateur subtil
  y = Math.max(y + 8, rightY + 8);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(leftMargin, y, rightX, y);

  // 4. Objet de la lettre
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const objectText = opts.subject || `Objet : Candidature pour le poste de ${position}`;
  doc.text(objectText, leftMargin, y);

  // 5. Formule d'appel
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // slate-800
  const salutation = opts.contactName && opts.contactName !== "Hiring Manager"
    ? `Bonjour ${opts.contactName},`
    : "Madame, Monsieur,";
  doc.text(salutation, leftMargin, y);

  // 6. Corps de la lettre
  y += 7;
  let cleanBody = opts.body
    .replace(/\[Company\]/g, company)
    .replace(/\[Position\]/g, position)
    .replace(/\[MyName\]/g, name)
    .replace(/\[Name\]/g, opts.contactName || "Hiring Manager");

  // Si le message commence par une salutation redondante, on peut la laisser propre
  const paragraphs = cleanBody.split(/\n+/).filter(Boolean);

  for (const para of paragraphs) {
    // Si le paragraphe est juste la formule d'appel ou la signature, on évite les doublons
    const trimmed = para.trim();
    if (trimmed.toLowerCase().startsWith("bonjour") || trimmed.toLowerCase().startsWith("madame, monsieur")) {
      continue;
    }
    if (trimmed.toLowerCase().startsWith("sincerely") || trimmed.toLowerCase().startsWith("cordialement") || trimmed.toLowerCase() === name.toLowerCase()) {
      continue;
    }

    const lines = doc.splitTextToSize(trimmed, contentWidth);
    
    // Vérification saut de page éventuel
    if (y + lines.length * 5.2 > 270) {
      doc.addPage();
      y = 25;
    }

    doc.text(lines, leftMargin, y);
    y += lines.length * 5.2 + 3.5;
  }

  // 7. Formule de politesse finale
  if (y + 25 > 270) {
    doc.addPage();
    y = 25;
  } else {
    y += 2;
  }

  const closing = "Dans l'attente d'un échange constructif, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.";
  const closingLines = doc.splitTextToSize(closing, contentWidth);
  doc.text(closingLines, leftMargin, y);
  y += closingLines.length * 5.2 + 8;

  // 8. Signature
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, rightX, y, { align: "right" });

  const fileName = `Lettre_Motivation_${company.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

  return {
    doc,
    fileName,
    // Base64 pur sans préfixe pour n8n
    getBase64: () => {
      const dataUri = doc.output("datauristring");
      return dataUri.replace(/^data:application\/pdf;filename=.*?;base64,/, "").replace(/^data:application\/pdf;base64,/, "");
    },
    // DataUri complet pour preview navigateur
    getDataUri: () => doc.output("datauristring"),
    // Téléchargement direct 1-clic
    download: () => {
      doc.save(fileName);
    },
  };
}
