export type LocalizedText = {
  sr: string;
  en: string;
};

export type AdminSectionKey =
  | "pocetna"
  | "aranzmani"
  | "putovanja"
  | "iznajmljivanje-vozila"
  | "verski-turizam"
  | "podesavanja";

export type AdminSectionIcon =
  | "dashboard"
  | "home"
  | "arrangements"
  | "trips"
  | "vehicles"
  | "users"
  | "media"
  | "settings"
  | "religious";

export type AdminSectionConfig = {
  key: AdminSectionKey;
  href: `/admin/${AdminSectionKey}`;
  label: LocalizedText;
  hint: LocalizedText;
  icon: AdminSectionIcon;
};

export const ADMIN_SECTIONS: AdminSectionConfig[] = [
  {
    key: "pocetna",
    href: "/admin/pocetna",
    label: { sr: "Početna", en: "Home" },
    hint: {
      sr: "Slike i redosled za početni swiper najtraženijih ruta",
      en: "Images and ordering for the homepage requested-routes swiper",
    },
    icon: "home",
  },
  {
    key: "aranzmani",
    href: "/admin/aranzmani",
    label: { sr: "Aranžmani", en: "Packages" },
    hint: {
      sr: "Kreiranje i uređivanje kompletnih aranžmana",
      en: "Create and edit full package details",
    },
    icon: "arrangements",
  },
  {
    key: "putovanja",
    href: "/admin/putovanja",
    label: { sr: "Putovanja", en: "Trips" },
    hint: {
      sr: "Video slajdovi i hero scene za stranicu Putovanja",
      en: "Video slides and hero scenes for the Trips page",
    },
    icon: "trips",
  },
  {
    key: "iznajmljivanje-vozila",
    href: "/admin/iznajmljivanje-vozila",
    label: { sr: "Iznajmljivanje vozila", en: "Vehicle rental" },
    hint: {
      sr: "Glavne i dodatne slike za autobus i luksuzni kombi sa vozačem",
      en: "Main and gallery images for coach and luxury van rental with driver",
    },
    icon: "vehicles",
  },
  {
    key: "verski-turizam",
    href: "/admin/verski-turizam",
    label: { sr: "Verski turizam", en: "Religious tourism" },
    hint: {
      sr: "Uređivanje verskih ponuda i hodočašća",
      en: "Religious offers and pilgrimage editor",
    },
    icon: "religious",
  },
  {
    key: "podesavanja",
    href: "/admin/podesavanja",
    label: { sr: "Podešavanja", en: "Settings" },
    hint: {
      sr: "Radno vreme, kontakt i Instagram",
      en: "Working hours, contact and Instagram",
    },
    icon: "settings",
  },
];

export type PageEditorSlot =
  | "home"
  | "aranzmani"
  | "putovanja"
  | "religious"
  | "country"
  | "about";

export type PageEditorConfig = {
  adminSection: AdminSectionKey;
  title: LocalizedText;
  description: LocalizedText;
  status: "ready" | "planned";
};

export const PAGE_EDITOR_CONFIG: Record<PageEditorSlot, PageEditorConfig> = {
  home: {
    adminSection: "pocetna",
    title: { sr: "Početna", en: "Home" },
    description: {
      sr: "Najtraženije rute (slajdovi sa linkom) i pregled kanala heroja. Ponude u sekcijama stižu iz kataloga.",
      en: "Most requested routes (slides with a link) and the hero channel overview. Offers in the sections come from the catalog.",
    },
    status: "ready",
  },
  aranzmani: {
    adminSection: "aranzmani",
    title: { sr: "Aranžmani", en: "Packages" },
    description: {
      sr: "ABLux programi: cene, program po danima, smeštaj, destinacije i slike.",
      en: "ABLux programs: prices, day-by-day program, accommodation, destinations and images.",
    },
    status: "ready",
  },
  putovanja: {
    adminSection: "putovanja",
    title: { sr: "Putovanja po zemljama", en: "Trips by country" },
    description: {
      sr: "Grupe putovanja po zemljama, njihove destinacije i slike.",
      en: "Trip groups by country, their destinations and images.",
    },
    status: "ready",
  },
  religious: {
    adminSection: "verski-turizam",
    title: { sr: "Verski turizam", en: "Religious tourism" },
    description: {
      sr: "ABLux verske ponude: termini, cene, PDF program i slike. Verske ponude partnera stižu iz uvoza.",
      en: "ABLux religious offers: dates, prices, PDF program and images. Partner offers come from the import.",
    },
    status: "ready",
  },
  country: {
    adminSection: "putovanja",
    title: { sr: "Stranica zemlje", en: "Country page" },
    description: {
      sr: "Ponude partnera stižu automatski iz uvoza; ABLux destinacije za ovu zemlju uređujete u delu Putovanja.",
      en: "Partner offers arrive automatically from the import; ABLux destinations for this country are edited under Trips.",
    },
    status: "ready",
  },
  about: {
    adminSection: "podesavanja",
    title: { sr: "O nama i kontakt", en: "About and contact" },
    description: {
      sr: "Kontakt podaci, radno vreme, mreže i broj licence uređuju se u Podešavanjima. Tekst stranice O nama menja developer.",
      en: "Contact details, opening hours, social links and the license number are edited in Settings. The About page text is changed by a developer.",
    },
    status: "ready",
  },
};
