import { jsPDF } from "jspdf";
import { readCandidateName } from "./workspace";
import { inferFirstNameFromEmail, personalizeEmailText } from "./emailPersonalizer";

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

function addClickableText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  url: string,
  color?: readonly [number, number, number]
): number {
  if (color) {
    doc.setTextColor(...color);
  }
  doc.text(text, x, y);
  const width = doc.getTextWidth(text);
  const fontSizePt = doc.getFontSize();
  // 1 pt ≈ 0.3528 mm in jsPDF
  const heightMm = fontSizePt * 0.3528;
  doc.link(x, y - heightMm * 0.82, width, heightMm * 1.15, { url });
  return width;
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
    rawBody.toLowerCase().includes("best regards") ||
    rawBody.toLowerCase().includes("[at company]") ||
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

  // Détection si l'entreprise fournie est générique ou "Recruteur Direct"
  const rawCompany = (opts.company || "").trim();
  const lowerCompany = rawCompany.toLowerCase();
  const isGenericCompany =
    !rawCompany ||
    lowerCompany === "recruteur direct" ||
    lowerCompany === "recrutement direct" ||
    lowerCompany === "recruteur" ||
    lowerCompany === "recruiter" ||
    lowerCompany === "direct" ||
    lowerCompany === "direct hire" ||
    lowerCompany === "the hiring team" ||
    lowerCompany === "hiring team" ||
    lowerCompany === "hiring manager" ||
    lowerCompany === "l'entreprise" ||
    lowerCompany === "entreprise" ||
    lowerCompany === "votre entreprise" ||
    lowerCompany === "votre équipe" ||
    lowerCompany === "équipe recrutement" ||
    lowerCompany === "equipe recrutement" ||
    lowerCompany === "company" ||
    lowerCompany === "société" ||
    lowerCompany === "societe" ||
    lowerCompany === "n/a" ||
    lowerCompany === "-";

  const position = opts.position || (isEnglish ? "Internship" : "Stage PFE");
  const dateFormatted = opts.dateStr || (isEnglish ? formatDateEnglish() : `Le ${formatDateFrench()}`);

  const leftMargin = 22;
  const pageWidth = 210;
  const contentWidth = 166; // 210 - 22 * 2
  const rightX = pageWidth - leftMargin;

  // Palette officielle du Portfolio (https://said-nichan-three.vercel.app/)
  const COLOR_PRIMARY = [34, 116, 165] as const; // #2274A5 - Bleu Canard Signature Portfolio
  const COLOR_DARK = [32, 32, 35] as const;       // #202023 - Charcoal Signature Portfolio
  const COLOR_CARD = [248, 248, 245] as const;    // #F8F8F5 - Fond Crème Signature Portfolio
  const COLOR_MUTED = [100, 116, 139] as const;   // #64748B - Gris Neutre
  const COLOR_BORDER = [226, 232, 240] as const;  // #E2E8F0 - Filet subtil

  // 0. Liseré supérieur bicolore signature Portfolio
  doc.setFillColor(...COLOR_PRIMARY); // #2274A5
  doc.rect(0, 0, 210, 3.2, "F");
  doc.setFillColor(...COLOR_DARK);    // #202023
  doc.rect(0, 3.2, 210, 0.6, "F");

  // 1. En-tête Candidat (Pleine largeur supérieure, sans aucun chevauchement)
  let y = 16.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_DARK);
  doc.text(name.toUpperCase(), leftMargin, y);

  if (title) {
    y += 5.2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_PRIMARY); // #2274A5
    doc.text(title, leftMargin, y);
  }

  // Ligne de contact (Ville • Email cliquable • Téléphone cliquable)
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  let curX = leftMargin;

  if (city) {
    doc.setTextColor(...COLOR_MUTED);
    doc.text(city, curX, y);
    curX += doc.getTextWidth(city);
  }

  if (email) {
    if (curX > leftMargin) {
      doc.setTextColor(...COLOR_MUTED);
      doc.text("   •   ", curX, y);
      curX += doc.getTextWidth("   •   ");
    }
    curX += addClickableText(doc, email, curX, y, `mailto:${email}`, COLOR_PRIMARY);
  }

  if (phone) {
    if (curX > leftMargin) {
      doc.setTextColor(...COLOR_MUTED);
      doc.text("   •   ", curX, y);
      curX += doc.getTextWidth("   •   ");
    }
    const cleanPhone = phone.replace(/[\s()-]/g, "");
    curX += addClickableText(doc, phone, curX, y, `tel:${cleanPhone}`, COLOR_MUTED);
  }

  // Ligne de portfolio & profils avec liens cliquables
  y += 4.2;
  doc.setFontSize(7.8);
  curX = leftMargin;

  curX += addClickableText(
    doc,
    "said-nichan-three.vercel.app",
    curX,
    y,
    "https://said-nichan-three.vercel.app",
    COLOR_PRIMARY
  );

  doc.setTextColor(...COLOR_MUTED);
  doc.text("   •   ", curX, y);
  curX += doc.getTextWidth("   •   ");

  curX += addClickableText(
    doc,
    "github.com/said101112",
    curX,
    y,
    "https://github.com/said101112",
    [100, 116, 139]
  );

  doc.setTextColor(...COLOR_MUTED);
  doc.text("   •   ", curX, y);
  curX += doc.getTextWidth("   •   ");

  curX += addClickableText(
    doc,
    "linkedin.com/in/nichan-said-940810313",
    curX,
    y,
    "https://linkedin.com/in/nichan-said-940810313",
    [100, 116, 139]
  );

  // 2. Filet séparateur horizontal net sous l'en-tête candidat
  y += 5;
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.35);
  doc.line(leftMargin, y, rightX, y);

  // 3. Bloc Destinataire & Date (Sous le filet, calé proprement à droite)
  const recipientBoxY = y + 4.5;
  const boxWidth = 75;
  const boxHeight = 22;
  const boxX = rightX - boxWidth;

  // Cartouche destinataire avec fond crème et bordure #E2E8F0
  doc.setFillColor(...COLOR_CARD);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.35);
  doc.roundedRect(boxX, recipientBoxY, boxWidth, boxHeight, 2, 2, "FD");

  // Accent vertical gauche sur le cartouche
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(boxX, recipientBoxY + 2, 1.8, boxHeight - 4, "F");

  // Libellés génériques élégants : Jamais "Recruteur Direct"
  let recipientHeader: string;
  let recipientTarget: string;

  if (isGenericCompany) {
    if (isEnglish) {
      recipientHeader = "To the attention of the";
      recipientTarget = "Hiring & Talent Acquisition Team";
    } else {
      recipientHeader = "À l'attention de la";
      recipientTarget = "Direction du Recrutement & Talents";
    }
  } else {
    if (isEnglish) {
      recipientHeader = "To the attention of the Hiring Team";
      recipientTarget = rawCompany;
    } else {
      recipientHeader = "À l'attention de l'équipe Recrutement";
      recipientTarget = rawCompany;
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(recipientHeader, boxX + 5, recipientBoxY + 5.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_DARK);
  const targetLines = doc.splitTextToSize(recipientTarget, boxWidth - 9);
  doc.text(targetLines[0], boxX + 5, recipientBoxY + 11.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(dateFormatted, boxX + 5, recipientBoxY + 17.5);

  // 4. Objet de la lettre (Sous le bloc destinataire avec gestion dynamique multi-lignes)
  y = recipientBoxY + boxHeight + 7;
  let objectText = opts.subject
    ? personalizeEmailText(opts.subject, {
        company: isGenericCompany ? null : rawCompany,
        contactName: opts.contactName,
        position,
        candidateName: name,
        isEnglish,
        stripFormatting: true,
      })
    : "";
  if (!objectText) {
    objectText = isEnglish
      ? `Subject: Application for a 6-Month Final-Year Internship – February 2027`
      : `Objet : Candidature pour un stage PFE de 6 mois – Février 2027`;
  } else if (!objectText.toLowerCase().startsWith("objet") && !objectText.toLowerCase().startsWith("subject")) {
    objectText = isEnglish ? `Subject: ${objectText}` : `Objet : ${objectText}`;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_DARK);

  const subjectTextX = leftMargin + 5.5;
  const subjectMaxWidth = rightX - subjectTextX; // 188 - 27.5 = 160.5 mm
  const subjectLines: string[] = doc.splitTextToSize(objectText, subjectMaxWidth);
  const subjectLineHeight = 4.4;
  const totalSubjectHeight = subjectLines.length * subjectLineHeight;
  const barHeight = Math.max(6.2, totalSubjectHeight + 0.8);

  // Barre d'accentuation verticale #2274A5 adaptée à la hauteur réelle du texte
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(leftMargin, y - 3.4, 2.5, barHeight, "F");

  doc.text(subjectLines, subjectTextX, y);
  y += totalSubjectHeight + 4.5;

  // 5. Formule d'appel naturelle (jamais "Madame, Monsieur")
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_DARK);

  const firstName = inferFirstNameFromEmail("", opts.contactName);
  const salutation = isEnglish
    ? firstName
      ? `Hello ${firstName},`
      : "Hello,"
    : firstName
      ? `Bonjour ${firstName},`
      : "Bonjour,";
  doc.text(salutation, leftMargin, y);

  // 6. Corps de la lettre (nettoyage des doublons/en-têtes redondants)
  y += 5.5;
  const cleanBody = personalizeEmailText(rawBody, {
    company: isGenericCompany ? null : rawCompany,
    contactName: opts.contactName,
    position,
    candidateName: name,
    isEnglish,
    stripFormatting: true,
  });

  const rawParagraphs = cleanBody.split(/\n+/).filter(Boolean);

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    const lower = trimmed.toLowerCase();

    // Ignorer les lignes de headers, coordonnées, liens redondants et formules de fin
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
      lower === "bonjour," ||
      lower === "bonjour" ||
      lower.startsWith("bonjour ") ||
      lower === "hello," ||
      lower === "hello" ||
      lower.startsWith("hello ") ||
      // Supprimer les liens redondants avec l'en-tête (portfolio, github, linkedin)
      lower.includes("consulter mes réalisations") ||
      lower.includes("explore my projects") ||
      lower.includes("said-nichan-three.vercel.app") ||
      lower.includes("github.com/said101112") ||
      lower.includes("linkedin.com/in/nichan") ||
      lower.startsWith("• portfolio") ||
      lower.startsWith("- portfolio") ||
      lower.startsWith("• github") ||
      lower.startsWith("- github") ||
      lower.startsWith("• linkedin") ||
      lower.startsWith("- linkedin") ||
      // Supprimer les formules de clôture pour éviter la duplication
      lower.includes("je serais ravi de pouvoir échanger") ||
      lower.includes("je serais ravi d’échanger") ||
      lower.includes("je serais ravi d'échanger") ||
      lower.includes("merci d’avance pour votre temps") ||
      lower.includes("merci d'avance pour votre temps") ||
      lower.includes("would welcome the opportunity to discuss") ||
      lower.includes("thank you for your time and consideration") ||
      lower.includes("salutations distinguées") ||
      lower.includes("je vous remercie pour votre attention") ||
      lower.includes("je vous prie d’agréer") ||
      lower.includes("je vous prie d'agréer") ||
      lower.includes("dans l'attente d'un échange") ||
      lower.includes("dans l'attente de votre retour") ||
      lower.startsWith("kind regards") ||
      lower.startsWith("best regards") ||
      lower.startsWith("bien cordialement") ||
      lower.startsWith("cordialement") ||
      lower.startsWith("sincerely") ||
      lower.startsWith("excellente journée")
    ) {
      continue;
    }

    const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-");
    const indent = isBullet ? leftMargin + 4 : leftMargin;
    const maxWidth = isBullet ? contentWidth - 4 : contentWidth;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_DARK);

    const lines = doc.splitTextToSize(trimmed, maxWidth);

    // Vérification saut de page
    if (y + lines.length * 4.4 > 268) {
      doc.addPage();
      y = 20;
    }

    if (isBullet) {
      // Petite puce stylisée #2274A5
      doc.setFillColor(...COLOR_PRIMARY);
      doc.circle(leftMargin + 1.5, y - 1, 0.8, "F");
    }

    doc.text(lines, indent, y);
    y += lines.length * 4.4 + (isBullet ? 2 : 3);
  }

  // 7. Formule de politesse finale
  if (y + 22 > 268) {
    doc.addPage();
    y = 20;
  } else {
    y += 1.5;
  }

  const closing = isEnglish
    ? "I would welcome the opportunity to discuss my background in a quick call or interview. Thank you for your time and consideration.\n\nKind regards,"
    : "Je serais ravi d’échanger avec vous lors d’un entretien. Merci d’avance pour votre temps et votre retour.\n\nBien cordialement,";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_DARK);
  const closingLines = doc.splitTextToSize(closing, contentWidth);
  doc.text(closingLines, leftMargin, y);
  y += closingLines.length * 4.4 + 6;

  // 8. Signature
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text(name, rightX, y, { align: "right" });

  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    isEnglish ? "Candidate – Final-Year Engineering" : "Élève-Ingénieur Génie Informatique (ENSA Tanger)",
    rightX,
    y,
    { align: "right" }
  );

  // 9. Pied de page discret avec lien portfolio cliquable
  const footerY = 286;
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, footerY - 3, rightX, footerY - 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 150, 165);
  doc.text("Saïd NICHAN • ENSA Tanger • Stage de Fin d'Études (PFE 2027)", leftMargin, footerY);

  const portfolioUrlText = "said-nichan-three.vercel.app";
  const pageNumberText = " • Page 1/1";
  const portfolioWidth = doc.getTextWidth(portfolioUrlText);
  const pageNumberWidth = doc.getTextWidth(pageNumberText);
  const totalFooterRightWidth = portfolioWidth + pageNumberWidth;
  const footerStartX = rightX - totalFooterRightWidth;

  addClickableText(
    doc,
    portfolioUrlText,
    footerStartX,
    footerY,
    "https://said-nichan-three.vercel.app",
    [140, 150, 165]
  );
  doc.setTextColor(140, 150, 165);
  doc.text(pageNumberText, footerStartX + portfolioWidth, footerY);

  // Nom de fichier standard sans nom d'entreprise (comme demandé)
  const fileName = isEnglish
    ? "Cover_Letter.pdf"
    : "Lettre_de_Motivation.pdf";

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
