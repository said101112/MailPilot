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
      name: "Saïd NICHAN",
      email: "saidnichan6@gmail.com",
      phone: "+212 713 668 431",
      city: "Salé, Maroc",
      title: "Élève-Ingénieur Génie Informatique (ENSA Tanger)",
    };
  }

  return {
    name: readCandidateName() || "Saïd NICHAN",
    email: localStorage.getItem(STORAGE_KEY_EMAIL) || "saidnichan6@gmail.com",
    phone: localStorage.getItem(STORAGE_KEY_PHONE) || "+212 713 668 431",
    city: localStorage.getItem(STORAGE_KEY_CITY) || "Salé, Maroc",
    title: localStorage.getItem(STORAGE_KEY_TITLE) || "Élève-Ingénieur Génie Informatique (ENSA Tanger)",
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

function formatDateEnglish(d: Date = new Date()): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function generateCoverLetterPdf(opts: CoverLetterOptions) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const rawBody = opts.body || "";
  const rawSubject = opts.subject || "";

  // Détection de la langue
  const isEnglish =
    rawSubject.toLowerCase().includes("application") ||
    rawSubject.toLowerCase().includes("internship") ||
    rawBody.toLowerCase().includes("dear hiring") ||
    rawBody.toLowerCase().includes("kind regards") ||
    rawBody.toLowerCase().includes("dear ");

  // Détection du domaine (Data/IA vs Développement)
  const isDataAi =
    rawSubject.toLowerCase().includes("data") ||
    rawSubject.toLowerCase().includes("intelligence artificielle") ||
    rawBody.toLowerCase().includes("data science") ||
    rawBody.toLowerCase().includes("trafficsignnet");

  const profile = getStoredCandidateProfile();
  const name = opts.candidateName || profile.name || "Saïd NICHAN";
  const email = opts.candidateEmail || profile.email || "saidnichan6@gmail.com";
  const phone = opts.candidatePhone || profile.phone || "+212 713 668 431";
  
  let city = opts.candidateCity || profile.city || (isEnglish ? "Salé, Morocco" : "Salé, Maroc");
  if (isEnglish && city === "Salé, Maroc") city = "Salé, Morocco";

  let title = opts.candidateTitle || profile.title || "";
  if (!title || title.includes("Génie Info") || title.includes("Élève")) {
    if (isDataAi) {
      title = isEnglish
        ? "Computer Engineering Student – Data Science & Artificial Intelligence (ENSA Tangier)"
        : "Élève-Ingénieur – Data Science & Intelligence Artificielle (ENSA Tanger)";
    } else {
      title = isEnglish
        ? "Computer Engineering Student – Software Engineering, Full Stack & AI (ENSA Tangier)"
        : "Élève-Ingénieur – Génie Informatique, Full Stack & IA (ENSA Tanger)";
    }
  }

  const company = opts.company || (isEnglish ? "The Hiring Team" : "L'Entreprise");
  const position = opts.position || (isEnglish ? "Internship" : "Stage PFE");
  const dateFormatted = opts.dateStr || (isEnglish ? formatDateEnglish() : `Le ${formatDateFrench()}`);

  const leftMargin = 22;
  const pageWidth = 210;
  const contentWidth = 166; // 210 - 22 * 2

  // 1. En-tête Candidat (Haut Gauche)
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(name, leftMargin, y);

  if (title) {
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235); // royal-blue
    doc.text(title, leftMargin, y);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500

  const contactPieces = [city, email, phone].filter(Boolean);
  if (contactPieces.length > 0) {
    y += 4.5;
    doc.text(contactPieces.join("  |  "), leftMargin, y);
  }

  // 2. Destinataire & Date (Haut Droite)
  const rightX = pageWidth - leftMargin;
  let rightY = 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    isEnglish ? "To the attention of the Hiring Team" : "À l'attention de l'équipe de Recrutement",
    rightX,
    rightY,
    { align: "right" }
  );

  rightY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(company, rightX, rightY, { align: "right" });

  rightY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(dateFormatted, rightX, rightY, { align: "right" });

  // 3. Filet de séparation
  y = Math.max(y + 7, rightY + 7);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(leftMargin, y, rightX, y);

  // 4. Objet de la lettre
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  let objectText = opts.subject || "";
  if (!objectText) {
    objectText = isEnglish
      ? `Subject: Application for a Final-Year Internship – February 2027`
      : `Objet : Candidature pour un stage PFE – Février 2027`;
  } else if (!objectText.toLowerCase().startsWith("objet") && !objectText.toLowerCase().startsWith("subject")) {
    objectText = isEnglish ? `Subject: ${objectText}` : `Objet : ${objectText}`;
  }
  doc.text(objectText, leftMargin, y);

  // 5. Formule d'appel
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59); // slate-800

  let salutation = isEnglish ? "Dear Hiring Team," : "Madame, Monsieur,";
  if (opts.contactName && opts.contactName !== "Hiring Manager" && opts.contactName.trim().length > 0) {
    salutation = isEnglish ? `Dear ${opts.contactName},` : `Bonjour ${opts.contactName},`;
  }
  doc.text(salutation, leftMargin, y);

  // 6. Corps de la lettre (nettoyage des doublons/en-têtes redondants)
  y += 6;
  const cleanBody = rawBody
    .replace(/\[Company\]/g, company)
    .replace(/\[Position\]/g, position)
    .replace(/\[MyName\]/g, name)
    .replace(/\[Name\]/g, opts.contactName || (isEnglish ? "Hiring Manager" : "Madame, Monsieur"));

  const rawParagraphs = cleanBody.split(/\n+/).filter(Boolean);

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    const lower = trimmed.toLowerCase();

    // Ignorer les lignes de headers redondants
    if (
      lower === name.toLowerCase() ||
      lower.includes("saidnichan6@gmail.com") ||
      lower.includes("+212 713 668 431") ||
      lower.includes("salé, maroc") ||
      lower.includes("salé, morocco") ||
      lower.startsWith("objet :") ||
      lower.startsWith("subject:") ||
      lower.startsWith("madame, monsieur") ||
      lower.startsWith("dear hiring team") ||
      lower.startsWith("dear ") ||
      lower.startsWith("bonjour ") ||
      lower.startsWith("kind regards") ||
      lower.startsWith("bien cordialement") ||
      lower.startsWith("sincerely") ||
      lower.startsWith("je vous prie d’agréer") ||
      lower.startsWith("je vous prie d'agréer") ||
      lower.startsWith("dans l'attente d'un échange")
    ) {
      continue;
    }

    const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-");
    const indent = isBullet ? leftMargin + 3 : leftMargin;
    const maxWidth = isBullet ? contentWidth - 3 : contentWidth;

    doc.setFont("helvetica", isBullet ? "normal" : "normal");
    doc.setFontSize(9.2);
    doc.setTextColor(30, 41, 59);

    const lines = doc.splitTextToSize(trimmed, maxWidth);

    // Vérification saut de page
    if (y + lines.length * 4.6 > 275) {
      doc.addPage();
      y = 22;
    }

    doc.text(lines, indent, y);
    y += lines.length * 4.6 + (isBullet ? 2 : 3);
  }

  // 7. Formule de politesse finale
  if (y + 24 > 275) {
    doc.addPage();
    y = 22;
  } else {
    y += 2;
  }

  const closing = isEnglish
    ? "Thank you for your time and consideration. I would welcome the opportunity to discuss my background and motivation in an interview."
    : "Je serais ravi de pouvoir échanger avec vous lors d’un entretien. Je vous remercie pour votre attention et vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  doc.setTextColor(30, 41, 59);
  const closingLines = doc.splitTextToSize(closing, contentWidth);
  doc.text(closingLines, leftMargin, y);
  y += closingLines.length * 4.6 + 6;

  // 8. Signature
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(name, rightX, y, { align: "right" });

  const safeCompany = company.replace(/[^a-zA-Z0-9_-]/g, "_");
  const prefix = isDataAi ? "Data_AI" : "Dev";
  const fileName = isEnglish
    ? `Cover_Letter_PFE_${prefix}_${safeCompany}.pdf`
    : `Lettre_Motivation_PFE_${prefix}_${safeCompany}.pdf`;

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
