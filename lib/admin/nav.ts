// Admin screens (sidebar, top bar title, command palette). One list, so the
// palette can jump anywhere the sidebar can.
import {
  Bus,
  Church,
  FileUp,
  RotateCcwClock,
  House,
  Inbox,
  LayoutDashboard,
  Luggage,
  Plane,
  RefreshCw,
  ScrollText,
  Settings,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";

type Pair = { sr: string; en: string };

export type AdminNavItem = {
  key: string;
  href: string;
  label: Pair;
  /** One line for the palette. */
  hint: Pair;
  icon: LucideIcon;
  ownerOnly?: boolean;
  /** Extra palette search words. */
  keywords?: string;
};

export type AdminNavGroup = { key: string; label: Pair | null; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    key: "start",
    label: null,
    items: [
      {
        key: "pregled",
        href: "/admin",
        label: { sr: "Pregled", en: "Overview" },
        hint: { sr: "Današnji upiti, stanje uvoza, izmene od juče", en: "Today's inquiries, sync status, changes since yesterday" },
        icon: LayoutDashboard,
        keywords: "kontrolna tabla dashboard pocetak",
      },
      {
        key: "upiti",
        href: "/admin/upiti",
        label: { sr: "Upiti i rezervacije", en: "Inquiries and bookings" },
        hint: { sr: "Upiti sa sajta i porudžbine sa IPS uplatom", en: "Website inquiries and IPS orders" },
        icon: Inbox,
        keywords: "porudzbine rezervacije ips uplata kupci",
      },
    ],
  },
  {
    key: "offers",
    label: { sr: "Ponude", en: "Offers" },
    items: [
      {
        key: "ponude",
        href: "/admin/ponude",
        label: { sr: "Sve ponude", en: "All offers" },
        hint: { sr: "ABLux programi i ponude partnera: objava, sakrivanje, izmene", en: "ABLux programs and partner offers" },
        icon: Ticket,
        keywords: "katalog objavi sakrij istakni",
      },
      {
        key: "izmene",
        href: "/admin/izmene",
        label: { sr: "Nove i izmenjene", en: "New and changed" },
        hint: { sr: "Šta je uvoz doneo: nove ponude, promene cena, skinute", en: "What imports changed: new offers, price changes, removals" },
        icon: RotateCcwClock,
        keywords: "promene cene uvoz",
      },
      {
        key: "partneri",
        href: "/admin/partneri",
        label: { sr: "Partneri i uvoz", en: "Partners and sync" },
        hint: { sr: "17 agencija, stanje uvoza, Pokreni sada, istorija", en: "17 agencies, sync status, run now, history" },
        icon: RefreshCw,
        keywords: "sinhronizacija sync agencije pokreni",
      },
      {
        key: "rucni-unos",
        href: "/admin/partneri/rucni-unos",
        label: { sr: "Ručni unos ponuda", en: "Manual offer entry" },
        hint: { sr: "Cenovnik iz PDF-a ili Excela (Holiday Plus KM)", en: "Price list from PDF or Excel (Holiday Plus KM)" },
        icon: FileUp,
        keywords: "holiday plus pdf excel cenovnik uvoz fajla",
      },
    ],
  },
  {
    key: "content",
    label: { sr: "Sadržaj sajta", en: "Site content" },
    items: [
      {
        key: "pocetna",
        href: "/admin/pocetna",
        label: { sr: "Početna", en: "Home" },
        hint: { sr: "Najtraženije rute i kanali heroja", en: "Popular routes and hero channels" },
        icon: House,
        keywords: "rute slajdovi hero",
      },
      {
        key: "aranzmani",
        href: "/admin/aranzmani",
        label: { sr: "Aranžmani", en: "Packages" },
        hint: { sr: "ABLux programi sa cenom, smeštajem i destinacijama", en: "ABLux programs with price, stays and destinations" },
        icon: Luggage,
        keywords: "programi putovanje smestaj destinacije",
      },
      {
        key: "putovanja",
        href: "/admin/putovanja",
        label: { sr: "Putovanja po zemljama", en: "Trips by country" },
        hint: { sr: "Stranice zemalja i njihove destinacije", en: "Country pages and their destinations" },
        icon: Plane,
        keywords: "zemlje destinacije",
      },
      {
        key: "verski-turizam",
        href: "/admin/verski-turizam",
        label: { sr: "Verski turizam", en: "Religious tourism" },
        hint: { sr: "Hodočašća i verske ponude", en: "Pilgrimages and religious offers" },
        icon: Church,
        keywords: "hodocasca manastiri",
      },
      {
        key: "vozila",
        href: "/admin/iznajmljivanje-vozila",
        label: { sr: "Iznajmljivanje vozila", en: "Vehicle rental" },
        hint: { sr: "Fotografije autobusa i kombija", en: "Coach and van photos" },
        icon: Bus,
        keywords: "autobus kombi rent a bus slike",
      },
    ],
  },
  {
    key: "settings",
    label: { sr: "Podešavanja", en: "Settings" },
    items: [
      {
        key: "podesavanja",
        href: "/admin/podesavanja",
        label: { sr: "Kontakt i podaci agencije", en: "Contact and agency details" },
        hint: { sr: "Telefon, e-adresa, radno vreme, licenca, mreže", en: "Phone, e-mail, hours, license, social links" },
        icon: Settings,
        keywords: "telefon adresa radno vreme licenca instagram facebook",
      },
      {
        key: "korisnici",
        href: "/admin/podesavanja/korisnici",
        label: { sr: "Korisnici i lozinka", en: "Users and password" },
        hint: { sr: "Promena lozinke; uloge zaposlenih (vlasnik)", en: "Change password; staff roles (owner)" },
        icon: Users,
        keywords: "lozinka uloge urednik vlasnik nalog",
      },
      {
        key: "dnevnik",
        href: "/admin/podesavanja/dnevnik",
        label: { sr: "Dnevnik izmena", en: "Audit log" },
        hint: { sr: "Ko je šta i kada menjao", en: "Who changed what and when" },
        icon: ScrollText,
        ownerOnly: true,
        keywords: "audit log istorija",
      },
    ],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV.flatMap((group) => group.items);

/** The screen for a path: exact match first, then the longest prefix. */
export function navItemForPath(pathname: string): AdminNavItem | undefined {
  const exact = ADMIN_NAV_ITEMS.find((item) => item.href === pathname);
  if (exact) return exact;
  return ADMIN_NAV_ITEMS.filter((item) => item.href !== "/admin" && pathname.startsWith(`${item.href}/`)).sort(
    (a, b) => b.href.length - a.href.length
  )[0];
}
