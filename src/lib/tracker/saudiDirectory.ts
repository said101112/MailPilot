import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";
import { createCompany, createContact, listCompanies, listContacts, updateCompany, updateContact } from "./queries";

export interface SaudiEntry {
  email: string;
  companyName: string;
  domain: string | null;
  sector: string;
  contactName: string;
  role: string;
}

export const SAUDI_DIRECTORY_ENTRIES: SaudiEntry[] = [
  {
    email: "cv@arabianfal.com",
    companyName: "Arabian Fal",
    domain: "arabianfal.com",
    sector: "Maintenance Industrielle & BTP",
    contactName: "Contact Recrutement Arabian Fal",
    role: "Recruteur / Contact Recrutement",
  },
  {
    email: "cv@aldawaa.com",
    companyName: "Al-Dawaa Medical Services",
    domain: "aldawaa.com",
    sector: "Santé & Pharmacies",
    contactName: "Recrutement Al-Dawaa",
    role: "Recruteur / RH",
  },
  {
    email: "hr.qrm@hotmail.com",
    companyName: "QRM Group KSA",
    domain: null,
    sector: "Services & Commerce",
    contactName: "Direction RH QRM",
    role: "Responsable RH",
  },
  {
    email: "rec@alojaimi.com",
    companyName: "Al Ojaimi Group",
    domain: "alojaimi.com",
    sector: "Énergie & BTP",
    contactName: "Recrutement Al Ojaimi",
    role: "Recruteur / Contact Recrutement",
  },
  {
    email: "recruitment@rawabiholding.com",
    companyName: "Rawabi Holding",
    domain: "rawabiholding.com",
    sector: "Pétrole, Énergie & Industrie",
    contactName: "Talent Acquisition Rawabi",
    role: "Talent Acquisition",
  },
  {
    email: "job.s6@hotmail.com",
    companyName: "S6 Group KSA",
    domain: null,
    sector: "Services aux Entreprises",
    contactName: "Contact Recrutement S6",
    role: "Recruteur",
  },
  {
    email: "careers@dnata.com",
    companyName: "dnata KSA",
    domain: "dnata.com",
    sector: "Aéronautique & Logistique",
    contactName: "Talent Acquisition dnata",
    role: "Talent Acquisition",
  },
  {
    email: "hr@alesayi_motors.com",
    companyName: "Alesayi Motors",
    domain: "alesayi-motors.com",
    sector: "Automobile & Transport",
    contactName: "Ressources Humaines Alesayi",
    role: "Responsable RH",
  },
  {
    email: "hr@alarayan.com",
    companyName: "Al Arayan Group",
    domain: "alarayan.com",
    sector: "Industrie & Négoce",
    contactName: "Ressources Humaines Al Arayan",
    role: "Responsable RH",
  },
  {
    email: "recruiting.ksa@mcmermott.com",
    companyName: "McDermott KSA",
    domain: "mcdermott.com",
    sector: "Ingénierie & Construction Maritime",
    contactName: "Recruiting KSA McDermott",
    role: "Recrutement KSA",
  },
  {
    email: "recruitment@aytb.com",
    companyName: "AYTB (Al Yusr Industrial)",
    domain: "aytb.com",
    sector: "Services Industriels & Maintenance",
    contactName: "Recrutement AYTB",
    role: "Talent Acquisition",
  },
  {
    email: "wadaef@gtecorp.com",
    companyName: "GTE Corp",
    domain: "gtecorp.com",
    sector: "Technologies & Équipements",
    contactName: "Recrutement GTE",
    role: "Contact Recrutement",
  },
  {
    email: "careers@nesr.com",
    companyName: "NESR (National Energy Services)",
    domain: "nesr.com",
    sector: "Services Pétroliers & Énergie",
    contactName: "Careers NESR",
    role: "Talent Acquisition",
  },
  {
    email: "recruit@farm.com",
    companyName: "Farm Superstores KSA",
    domain: "farm.com.sa",
    sector: "Distribution & Agroalimentaire",
    contactName: "Recrutement Farm",
    role: "Recruteur",
  },
  {
    email: "info@alhumamlaw.com",
    companyName: "Al Humam Law Firm",
    domain: "alhumamlaw.com",
    sector: "Conseil Juridique & Avocats",
    contactName: "Contact Al Humam Law",
    role: "Contact Entreprise",
  },
  {
    email: "hr1@gulfteksaudi.com",
    companyName: "Gulftek Saudi",
    domain: "gulfteksaudi.com",
    sector: "Énergie & Pétrochimie",
    contactName: "RH Gulftek Saudi",
    role: "Responsable RH",
  },
  {
    email: "catcosa@catcosa.com",
    companyName: "Catcosa",
    domain: "catcosa.com",
    sector: "Services Maritimes & Logistique",
    contactName: "Contact Catcosa",
    role: "Contact Recrutement",
  },
  {
    email: "cv@tafear.com",
    companyName: "Tafear Contracting",
    domain: "tafear.com",
    sector: "BTP & Construction",
    contactName: "Recrutement Tafear",
    role: "Contact Recrutement",
  },
  {
    email: "recruitment@sraco.com",
    companyName: "SRACO Company",
    domain: "sraco.com.sa",
    sector: "Ingénierie & Facility Management",
    contactName: "Recrutement SRACO",
    role: "Talent Acquisition",
  },
  {
    email: "info@atco.com",
    companyName: "A. A. Turki Corporation (ATCO)",
    domain: "atco.com.sa",
    sector: "Conglomérat Industriel & Services",
    contactName: "Contact ATCO",
    role: "Contact Entreprise",
  },
  {
    email: "hrdepartmental@sa.yokogawa.com",
    companyName: "Yokogawa Saudi Arabia",
    domain: "yokogawa.com",
    sector: "Automatisation & Ingénierie",
    contactName: "HR Departmental Yokogawa",
    role: "Directeur RH",
  },
  {
    email: "recruitment@shadeco.com",
    companyName: "Shade Corporation",
    domain: "shadeco.com",
    sector: "BTP & Génie Civil",
    contactName: "Recrutement Shade",
    role: "Talent Acquisition",
  },
  {
    email: "klc.hr@alkafaa.com",
    companyName: "Al Kafaa",
    domain: "alkafaa.com",
    sector: "Équipements & Industrie",
    contactName: "HR Al Kafaa",
    role: "Responsable RH",
  },
  {
    email: "kbr-amcdehr@kbr.com",
    companyName: "KBR AMCDE Saudi",
    domain: "kbr.com",
    sector: "Ingénierie & Conseil",
    contactName: "HR KBR AMCDE",
    role: "Responsable RH",
  },
  {
    email: "recruitment@batook.com",
    companyName: "Batook Specialities Food",
    domain: "batook.com",
    sector: "Agroalimentaire",
    contactName: "Recrutement Batook",
    role: "Talent Acquisition",
  },
  {
    email: "career@shawarmer.com",
    companyName: "Shawarmer",
    domain: "shawarmer.com",
    sector: "Restauration & Franchise",
    contactName: "Recrutement Shawarmer",
    role: "Contact Recrutement",
  },
  {
    email: "hrsupport@archirodon.net",
    companyName: "Archirodon KSA",
    domain: "archirodon.net",
    sector: "Infrastructures & Travaux Maritimes",
    contactName: "HR Support Archirodon",
    role: "Support RH",
  },
  {
    email: "jobs@binajinah.com",
    companyName: "Bin Ajinah Group",
    domain: "binajinah.com",
    sector: "Transport & Logistique",
    contactName: "Recrutement Bin Ajinah",
    role: "Talent Acquisition",
  },
  {
    email: "marketing.np@nesma.com",
    companyName: "Nesma Holding",
    domain: "nesma.com",
    sector: "Infrastructure, BTP & Télécoms",
    contactName: "Nesma Recrutement",
    role: "Contact Entreprise",
  },
  {
    email: "wadaef2019@abdulla-fouad.com",
    companyName: "Abdulla Fouad Group",
    domain: "abdulla-fouad.com",
    sector: "Conglomérat Commercial & Médical",
    contactName: "Recrutement Abdulla Fouad",
    role: "Talent Acquisition",
  },
  {
    email: "careers@innosoft.sa",
    companyName: "Innosoft KSA",
    domain: "innosoft.sa",
    sector: "Technologies & Logiciels",
    contactName: "Careers Innosoft",
    role: "Talent Acquisition",
  },
  {
    email: "m@startime.com",
    companyName: "Startime KSA",
    domain: "startime.com",
    sector: "Média & Événementiel",
    contactName: "Contact Startime",
    role: "Contact Entreprise",
  },
  {
    email: "job@musk.sa.com",
    companyName: "Musk Holding",
    domain: "musk.sa.com",
    sector: "Investissement & Développement",
    contactName: "Recrutement Musk",
    role: "Contact Recrutement",
  },
  {
    email: "shababwatansa@gmail.com",
    companyName: "Shabab Watan KSA",
    domain: null,
    sector: "Recrutement & Insertion Pro",
    contactName: "Recrutement Shabab Watan",
    role: "Contact Recrutement",
  },
  {
    email: "j@sabksa.com",
    companyName: "SAB KSA",
    domain: "sabksa.com",
    sector: "Banque & Finance",
    contactName: "Contact SAB",
    role: "Contact Entreprise",
  },
  {
    email: "al.alshaikh@bonyan.sa",
    companyName: "Bonyan Real Estate",
    domain: "bonyan.sa",
    sector: "Promotion Immobilière & Construction",
    contactName: "Al Alshaikh",
    role: "Recruteur / Contact Recrutement",
  },
  {
    email: "ymohammed@innovest.com",
    companyName: "Innovest Holding",
    domain: "innovest.com",
    sector: "Investissement & Finance",
    contactName: "Y. Mohammed",
    role: "Recruteur / Contact Recrutement",
  },
  {
    email: "s.alwadi@nhc.sa",
    companyName: "National Housing Company (NHC)",
    domain: "nhc.sa",
    sector: "Immobilier & Développement Urbain",
    contactName: "S. Alwadi",
    role: "Responsable Recrutement",
  },
  {
    email: "i.atassi@artar.com.sa",
    companyName: "ARTAR Real Estate",
    domain: "artar.com.sa",
    sector: "Promotion Immobilière",
    contactName: "I. Atassi",
    role: "Contact Recrutement",
  },
  {
    email: "oalkhunaizi@darwaemaar.com",
    companyName: "Dar Wa Emaar",
    domain: "darwaemaar.com",
    sector: "Immobilier & Résidences",
    contactName: "O. Alkhunaizi",
    role: "Contact Recrutement",
  },
  {
    email: "jobs@almasah.net",
    companyName: "Al Masah Group",
    domain: "almasah.net",
    sector: "Santé, Optique & Distribution",
    contactName: "Recrutement Al Masah",
    role: "Talent Acquisition",
  },
  {
    email: "recruitment.amjad@gmail.com",
    companyName: "Amjad KSA",
    domain: null,
    sector: "Services RH & Sourcing",
    contactName: "Recrutement Amjad",
    role: "Recruteur",
  },
  {
    email: "jobrydlaw@gmail.com",
    companyName: "Riyadh Law Office",
    domain: null,
    sector: "Cabinet d'Avocats & Juridique",
    contactName: "Recrutement Riyadh Law",
    role: "Recruteur",
  },
  {
    email: "job@almoosahospital.com",
    companyName: "Almoosa Specialist Hospital",
    domain: "almoosahospital.com",
    sector: "Hôpital & Soins Spécialisés",
    contactName: "Job Almoosa Hospital",
    role: "Recruteur Médical",
  },
  {
    email: "recruitment@almoosahospital.com",
    companyName: "Almoosa Specialist Hospital",
    domain: "almoosahospital.com",
    sector: "Hôpital & Soins Spécialisés",
    contactName: "Recrutement Almoosa",
    role: "Talent Acquisition Santé",
  },
  {
    email: "jobs@sghgroup.net",
    companyName: "Saudi German Health (SGH Group)",
    domain: "sghgroup.net",
    sector: "Réseau Hospitalier & Santé",
    contactName: "Jobs SGH Group",
    role: "Talent Acquisition Santé",
  },
  {
    email: "career.dmm@sghgroup.net",
    companyName: "Saudi German Hospital Dammam",
    domain: "sghgroup.net",
    sector: "Hôpital & Réseau Médical",
    contactName: "Career SGH Dammam",
    role: "Recruteur Médical",
  },
  {
    email: "talent.acquisition@drsulaimanalhabib.com",
    companyName: "Dr. Sulaiman Al Habib Medical Group",
    domain: "drsulaimanalhabib.com",
    sector: "Hôpitaux & Centres Médicaux",
    contactName: "Talent Acquisition Al Habib",
    role: "Talent Acquisition Médical",
  },
  {
    email: "careers@jhah.com",
    companyName: "Johns Hopkins Aramco Healthcare (JHAH)",
    domain: "jhah.com",
    sector: "Santé de Pointe & Hôpital",
    contactName: "Careers JHAH",
    role: "Talent Acquisition",
  },
  {
    email: "hrd@alahsahospital.com",
    companyName: "Al Ahsa Hospital",
    domain: "alahsahospital.com",
    sector: "Hôpital Général & Soins",
    contactName: "HRD Al Ahsa Hospital",
    role: "Direction RH",
  },
  {
    email: "career@almanahospital.com",
    companyName: "Al Mana General Hospitals",
    domain: "almanahospital.com",
    sector: "Groupe Hospitalier",
    contactName: "Career Al Mana",
    role: "Contact Recrutement",
  },
  {
    email: "info@familycare.com",
    companyName: "Family Care Hospital",
    domain: "familycare.com",
    sector: "Hôpital & Soins de Proximité",
    contactName: "Contact Family Care",
    role: "Contact Entreprise",
  },
  {
    email: "info@ramclinics.com",
    companyName: "Ram Clinics",
    domain: "ramclinics.com",
    sector: "Centres Médicaux & Dentaires",
    contactName: "Contact Ram Clinics",
    role: "Contact Entreprise",
  },
  {
    email: "hr.dsfhr@fakeeh.care",
    companyName: "Fakeeh Care",
    domain: "fakeeh.care",
    sector: "Soins de Santé & Cliniques",
    contactName: "HR Fakeeh Care",
    role: "Responsable RH",
  },
  {
    email: "career@mouwasat.com",
    companyName: "Mouwasat Medical Services",
    domain: "mouwasat.com",
    sector: "Hôpitaux & Santé",
    contactName: "Career Mouwasat",
    role: "Contact Recrutement",
  },
  {
    email: "careers@dallah-hospital.com",
    companyName: "Dallah Hospital",
    domain: "dallah-hospital.com",
    sector: "Hôpital & Chirurgie",
    contactName: "Careers Dallah Hospital",
    role: "Talent Acquisition",
  },
  {
    email: "hr.phc@drsulaimanalhabib.com",
    companyName: "Dr. Sulaiman Al Habib Medical Group",
    domain: "drsulaimanalhabib.com",
    sector: "Soins Primaires & Hôpitaux",
    contactName: "HR PHC Al Habib",
    role: "Responsable RH",
  },
  {
    email: "careers@almurjanhospital.com",
    companyName: "Al Murjan Hospital",
    domain: "almurjanhospital.com",
    sector: "Hôpital & Centre Médical",
    contactName: "Careers Al Murjan",
    role: "Talent Acquisition",
  },
  {
    email: "hiringnow.ksa@gmail.com",
    companyName: "Hiring Now KSA",
    domain: null,
    sector: "Cabinet de Recrutement KSA",
    contactName: "Hiring Team KSA",
    role: "Recruteur KSA",
  },
];

/**
 * Attaches and categorizes all Saudi Arabian companies and contacts in the user's workspace:
 * - Upserts the Saudi companies with location: "Arabie Saoudite"
 * - Upserts the contacts and links them to their Saudi company
 */
export async function syncSaudiDirectory(): Promise<{
  createdCompanies: number;
  updatedCompanies: number;
  createdContacts: number;
  updatedContacts: number;
}> {
  const userId = await getAuthUserId();
  const [existingCompanies, existingContacts] = await Promise.all([
    listCompanies(),
    listContacts(),
  ]);

  let createdCompanies = 0;
  let updatedCompanies = 0;
  let createdContacts = 0;
  let updatedContacts = 0;

  // Cache companies by name (lower) and domain (lower)
  const compByName = new Map<string, (typeof existingCompanies)[0]>();
  const compByDomain = new Map<string, (typeof existingCompanies)[0]>();
  for (const c of existingCompanies) {
    compByName.set(c.name.trim().toLowerCase(), c);
    if (c.domain) compByDomain.set(c.domain.trim().toLowerCase(), c);
  }

  // Cache contacts by email (lower)
  const contactByEmail = new Map<string, (typeof existingContacts)[0]>();
  for (const ct of existingContacts) {
    if (ct.email) contactByEmail.set(ct.email.trim().toLowerCase(), ct);
  }

  for (const entry of SAUDI_DIRECTORY_ENTRIES) {
    const cleanEmail = entry.email.trim().toLowerCase();
    const cleanCompName = entry.companyName.trim().toLowerCase();
    const cleanDomain = entry.domain?.trim().toLowerCase() || null;

    // 1. Resolve or Create Company
    let targetCompany = compByName.get(cleanCompName);
    if (!targetCompany && cleanDomain) {
      targetCompany = compByDomain.get(cleanDomain);
    }

    if (targetCompany) {
      // Check if location needs updating to "Arabie Saoudite"
      if (!targetCompany.location || targetCompany.location.toLowerCase() !== "arabie saoudite") {
        try {
          const updated = await updateCompany(targetCompany.id, {
            location: "Arabie Saoudite",
            sector: targetCompany.sector || entry.sector,
            website: targetCompany.website || (cleanDomain ? `https://${cleanDomain}` : null),
          });
          targetCompany = updated;
          updatedCompanies += 1;
        } catch {
          // ignore error if network blip
        }
      }
    } else {
      try {
        const created = await createCompany({
          name: entry.companyName,
          domain: cleanDomain,
          website: cleanDomain ? `https://${cleanDomain}` : null,
          sector: entry.sector,
          location: "Arabie Saoudite",
        });
        targetCompany = created;
        compByName.set(cleanCompName, created);
        if (cleanDomain) compByDomain.set(cleanDomain, created);
        createdCompanies += 1;
      } catch {
        // If conflict, re-fetch
        const { data: found } = await supabase
          .from("companies")
          .select("*")
          .eq("user_id", userId)
          .ilike("name", entry.companyName)
          .limit(1);
        if (found && found.length > 0) {
          targetCompany = found[0];
        }
      }
    }

    if (!targetCompany) continue;

    // 2. Resolve or Create Contact
    const targetContact = contactByEmail.get(cleanEmail);
    if (targetContact) {
      if (targetContact.company_id !== targetCompany.id) {
        try {
          await updateContact(targetContact.id, {
            company_id: targetCompany.id,
          });
          updatedContacts += 1;
        } catch {
          // ignore
        }
      }
    } else {
      try {
        const newContact = await createContact({
          full_name: entry.contactName,
          email: cleanEmail,
          role: entry.role,
          company_id: targetCompany.id,
          next_action: "Suivre l'email de candidature envoyé",
        });
        contactByEmail.set(cleanEmail, newContact);
        createdContacts += 1;
      } catch {
        // ignore
      }
    }
  }

  return {
    createdCompanies,
    updatedCompanies,
    createdContacts,
    updatedContacts,
  };
}
