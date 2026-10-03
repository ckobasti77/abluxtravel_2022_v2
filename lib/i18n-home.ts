// Copy for the homepage (step 11). Exposed as `dictionary.homepage` (see lib/i18n.ts).
// Serbian first, formal "Vi", no hype, no exclamation marks, no invented facts.

import type { HeroChannelKey } from "./home/hero-manifest";

type ChannelCopy = {
  index: string;
  title: string;
  meta: string;
  /** Decorative stamp code (route letters), hidden from assistive tech. */
  code: string;
  href: string;
  linkLabel: string;
};

const sr = {
  heroStampSince: "od 2022.",
  heroKicker: "Vaš partner na putu",
  heroLine1: "Putovanja sa",
  heroLine2: "potpisom",
  heroEmphasis: "sigurnosti",
  heroLead: "Verske rute, letovanja i gradske ture planirane bez slučajnosti.",
  ctaOffers: "Pogledaj ponude",
  ctaInquiry: "Pošalji upit",
  channelsLabel: "Scene na početnoj",
  channelSelect: "Prikaži scenu",
  pauseScenes: "Zaustavi smenu scena",
  playScenes: "Nastavi smenu scena",
  stampRoute: "Ruta",
  channels: {
    hodocasca: {
      index: "01",
      title: "Hodočašća",
      meta: "Vera · mir · povezanost",
      code: "BEG → JER",
      href: "/ponude?tip=verski-turizam",
      linkLabel: "Ponude za hodočašća",
    },
    mediteran: {
      index: "02",
      title: "Mediteran",
      meta: "More · sunce · odmor",
      code: "BEG → ADR",
      href: "/ponude?tip=letovanje",
      linkLabel: "Ponude za letovanje",
    },
    evropa: {
      index: "03",
      title: "Evropski gradovi",
      meta: "Kultura · istorija · doživljaj",
      code: "BEG → PAR",
      href: "/ponude?tip=evropski-gradovi",
      linkLabel: "Ponude za evropske gradove",
    },
  } satisfies Record<HeroChannelKey, ChannelCopy>,

  upcomingOverline: "Kalendar polazaka",
  upcomingTitle: "Uskoro",
  upcomingEmphasis: "polaze",
  upcomingIntro: "Najbliži polasci iz ABLux programa i ponuda partnerskih agencija. Uz svaku ponudu piše ko je organizator putovanja.",
  upcomingLink: "Svi polasci",
  upcomingEmpty: "Trenutno nema objavljenih polazaka. Pogledajte sve ponude ili nam pošaljite upit, pa ćemo Vam predložiti termin.",
  postcardFrom: "Pozdrav sa puta",

  routesOverline: "Pravci",
  routesTitle: "Najtraženije rute",
  routesIntro: "Pažljivo odabrane destinacije, jasni programi i put koji ima smisla.",
  routesLink: "Sve ponude",
  routeDetails: "Detalji",

  religiousOverline: "Verski turizam",
  religiousTitle: "Hodočašća vođena",
  religiousEmphasis: "s pažnjom",
  religiousIntro:
    "Verski programi su srce ABLux ponude: manastiri Srbije i Crne Gore, Ostrog i Sveta zemlja, sa ritmom koji ostavlja vremena za molitvu, odmor i razgovor.",
  religiousPoints: [
    "Pažljivo planirane pauze i obilasci",
    "Prevoz i vođenje grupe na celom putu",
    "Za parohijske grupe, porodice i pojedince",
  ],
  religiousCta: "Verski turizam",
  religiousOffers: "Ponude za hodočašća",
  religiousCaption: "Ostrog, Crna Gora",

  partnersOverline: "Partnerske agencije",
  partnersTitleJoin: "jedan",
  partnersTitleEmphasis: "potpis",
  partnersIntro:
    "Ponude partnerskih agencija prikazujemo na jednom mestu, uvek sa imenom organizatora putovanja. Upit i rezervaciju za Vas vodi ABLux.",
  partnersWaiting: "Ponude uskoro",
  partnersLink: "Sve partnerske ponude",
  partnersEmpty: "Spisak partnerskih agencija objavljujemo uskoro.",

  proofOverline: "Zašto putnici biraju ABLux",
  proofTitle: "Programi koji znaju ritam puta",
  proofDocumentTitle: "Ruta sa smislom",
  proofItems: [
    { title: "Provereni polasci", body: "Polasci se vode kroz jasne termine, rutu i uslove pre nego što putnik potvrdi mesto." },
    { title: "Jasan plan", body: "Program prikazuje tempo dana, pauze, susrete i ključne tačke bez sitnih iznenađenja." },
    { title: "Smiren tempo", body: "Ruta se planira tako da obilazak ostane dostojanstven, pregledan i realan za grupu." },
    { title: "Podrška tokom puta", body: "Isti tim drži komunikaciju, izmene i dogovore povezanim od polaska do povratka." },
  ],

  processOverline: "Od upita do puta",
  processTitle: "Planiranje bez slučajnosti",
  processStepLabel: "Korak",
  processOf: "od",
  processItems: [
    { title: "Razgovor", body: "Kažete termin, tip puta i okvir grupe." },
    { title: "Predlog rute", body: "Dobijate konkretan plan i tempo." },
    { title: "Potvrda putovanja", body: "Zaključavaju se termini, uslovi i logistika." },
  ],

  vehicleOverline: "Prevoz za grupe",
  vehicleTitle: "Iznajmljivanje vozila sa vozačem",
  vehicleIntro: "Setra autobus i Mercedes Sprinter luksuzni kombi za grupe, transfere i posebne rute.",
  vehicleCta: "Pogledaj vozila",
  vehicleDriver: "Usluga sa profesionalnim vozačem",

  closingPlace: "ABLux Travel, Beograd",
  closingTitle: "Neka sledeći polazak bude mirno planiran.",
  closingInquiry: "Pošalji upit",
  closingOffers: "Pogledaj ponude",
};

export type HomeCopy = typeof sr;

const en: HomeCopy = {
  heroStampSince: "since 2022",
  heroKicker: "Your travel partner",
  heroLine1: "Trips with",
  heroLine2: "a signature of",
  heroEmphasis: "certainty",
  heroLead: "Pilgrimage routes, summer trips, and city tours planned without guesswork.",
  ctaOffers: "View offers",
  ctaInquiry: "Send inquiry",
  channelsLabel: "Homepage scenes",
  channelSelect: "Show scene",
  pauseScenes: "Pause scene rotation",
  playScenes: "Resume scene rotation",
  stampRoute: "Route",
  channels: {
    hodocasca: {
      index: "01",
      title: "Pilgrimages",
      meta: "Faith · calm · connection",
      code: "BEG → JER",
      href: "/ponude?tip=verski-turizam",
      linkLabel: "Pilgrimage offers",
    },
    mediteran: {
      index: "02",
      title: "Mediterranean",
      meta: "Sea · sun · rest",
      code: "BEG → ADR",
      href: "/ponude?tip=letovanje",
      linkLabel: "Summer holiday offers",
    },
    evropa: {
      index: "03",
      title: "European cities",
      meta: "Culture · history · experience",
      code: "BEG → PAR",
      href: "/ponude?tip=evropski-gradovi",
      linkLabel: "European city offers",
    },
  },

  upcomingOverline: "Departure calendar",
  upcomingTitle: "Departing",
  upcomingEmphasis: "soon",
  upcomingIntro: "The nearest departures from ABLux programs and partner agency offers. Every offer names its tour organizer.",
  upcomingLink: "All departures",
  upcomingEmpty: "There are no published departures right now. Browse all offers or send us an inquiry and we will suggest a date.",
  postcardFrom: "Greetings from the road",

  routesOverline: "Directions",
  routesTitle: "Most requested routes",
  routesIntro: "Carefully chosen destinations, clear programs, and a journey that makes sense.",
  routesLink: "All offers",
  routeDetails: "Details",

  religiousOverline: "Religious tourism",
  religiousTitle: "Pilgrimages led",
  religiousEmphasis: "with care",
  religiousIntro:
    "Religious programs are the heart of ABLux: the monasteries of Serbia and Montenegro, Ostrog, and the Holy Land, at a pace that leaves time for prayer, rest, and conversation.",
  religiousPoints: [
    "Carefully planned stops and visits",
    "Transport and group guidance for the whole journey",
    "For parish groups, families, and individual travelers",
  ],
  religiousCta: "Religious tourism",
  religiousOffers: "Pilgrimage offers",
  religiousCaption: "Ostrog, Montenegro",

  partnersOverline: "Partner agencies",
  partnersTitleJoin: "one",
  partnersTitleEmphasis: "signature",
  partnersIntro:
    "We show the offers of our partner agencies in one place, always with the name of the tour organizer. ABLux handles your inquiry and booking.",
  partnersWaiting: "Offers coming soon",
  partnersLink: "All partner offers",
  partnersEmpty: "The list of partner agencies will be published soon.",

  proofOverline: "Why travelers choose ABLux",
  proofTitle: "Programs that understand the rhythm of travel",
  proofDocumentTitle: "A route with meaning",
  proofItems: [
    { title: "Verified departures", body: "Departures are organized around clear dates, route details, and terms before booking." },
    { title: "Clear plan", body: "The program shows daily rhythm, stops, meetings, and key points without surprises." },
    { title: "Calm tempo", body: "The route is planned so the journey remains dignified, clear, and realistic for the group." },
    { title: "Trip support", body: "The same team keeps communication, updates, and agreements connected from start to return." },
  ],

  processOverline: "From inquiry to departure",
  processTitle: "Planning without guesswork",
  processStepLabel: "Step",
  processOf: "of",
  processItems: [
    { title: "Conversation", body: "Share date, trip type, and group outline." },
    { title: "Route proposal", body: "Receive a concrete plan and tempo." },
    { title: "Confirmation", body: "Dates, terms, and logistics are locked." },
  ],

  vehicleOverline: "Group transport",
  vehicleTitle: "Vehicle rental with driver",
  vehicleIntro: "A Setra coach and a Mercedes Sprinter luxury van for groups, transfers, and special routes.",
  vehicleCta: "View vehicles",
  vehicleDriver: "Professional driver included",

  closingPlace: "ABLux Travel, Belgrade",
  closingTitle: "Let the next departure be calmly planned.",
  closingInquiry: "Send inquiry",
  closingOffers: "View offers",
};

export const HOME_COPY: Record<"sr" | "en", HomeCopy> = { sr, en };

/** "17 agencija" / "3 agencije" / "1 agencija"; English "17 agencies". */
export function agencyCountLabel(count: number, language: "sr" | "en"): string {
  if (language === "en") return `${count} ${count === 1 ? "agency" : "agencies"}`;
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "agencije" : "agencija";
  return `${count} ${word}`;
}
