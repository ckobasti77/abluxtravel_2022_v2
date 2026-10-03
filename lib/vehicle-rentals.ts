export type VehicleRentalKey = "bus" | "luxuryVan";

export type LocalizedVehicleText = {
  sr: string;
  en: string;
};

export type VehicleRentalItem = {
  key: VehicleRentalKey;
  title: LocalizedVehicleText;
  shortTitle: LocalizedVehicleText;
  eyebrow: LocalizedVehicleText;
  description: LocalizedVehicleText;
  bestFor: LocalizedVehicleText;
  capacity: LocalizedVehicleText;
  highlights: LocalizedVehicleText[];
};

export const VEHICLE_RENTAL_ITEMS: VehicleRentalItem[] = [
  {
    key: "bus",
    title: {
      sr: "Iznajmljivanje autobusa sa vozačem",
      en: "Coach rental with driver",
    },
    shortTitle: {
      sr: "Autobus sa vozačem",
      en: "Coach with driver",
    },
    eyebrow: {
      sr: "Grupe i organizovana putovanja",
      en: "Groups and organized travel",
    },
    description: {
      sr: "Pouzdan prevoz za ekskurzije, korporativne događaje, transfere, sportske klubove i veće turističke grupe uz profesionalnog vozača.",
      en: "Reliable transport for excursions, corporate events, transfers, sports clubs, and larger tour groups with a professional driver.",
    },
    bestFor: {
      sr: "Ekskurzije, hodočašća, ture, transferi i veće grupe.",
      en: "Excursions, pilgrimages, tours, transfers, and larger groups.",
    },
    capacity: {
      sr: "Kapacitet se usklađuje sa veličinom grupe.",
      en: "Capacity is matched to the group size.",
    },
    highlights: [
      {
        sr: "Plan rute, pauze i termini vožnje dogovaraju se unapred.",
        en: "Route, stops, and timing are agreed in advance.",
      },
      {
        sr: "Vozač vodi računa o bezbednom i komfornom toku puta.",
        en: "The driver manages a safe and comfortable journey.",
      },
      {
        sr: "Pogodno za jednodnevne i višednevne programe.",
        en: "Suitable for one-day and multi-day programs.",
      },
    ],
  },
  {
    key: "luxuryVan",
    title: {
      sr: "Iznajmljivanje luksuznog kombija sa vozačem",
      en: "Luxury van rental with driver",
    },
    shortTitle: {
      sr: "Luksuzni kombi sa vozačem",
      en: "Luxury van with driver",
    },
    eyebrow: {
      sr: "Privatni transferi i manje grupe",
      en: "Private transfers and small groups",
    },
    description: {
      sr: "Komforan prevoz za manje grupe, poslovne goste, aerodromske transfere i posebne prilike.",
      en: "Comfortable transport for smaller groups, business guests, airport transfers and special occasions.",
    },
    bestFor: {
      sr: "Transferi, poslovna putovanja, aerodromi i male grupe.",
      en: "Transfers, business trips, airports and small groups.",
    },
    capacity: {
      sr: "Za manje grupe kojima je bitan komfor.",
      en: "For smaller groups that value comfort.",
    },
    highlights: [
      {
        sr: "Fleksibilan polazak i direktan prevoz bez nepotrebnih zadržavanja.",
        en: "Flexible departure and direct transport without unnecessary delays.",
      },
      {
        sr: "Usluga sa vozačem za miran i organizovan put.",
        en: "Chauffeured service for a calm and organized trip.",
      },
      {
        sr: "Pogodan za poslovne i privatne transfere.",
        en: "Suited to business and private transfers.",
      },
    ],
  },
];

export const VEHICLE_RENTAL_PATH = "/iznajmljivanje-vozila";
