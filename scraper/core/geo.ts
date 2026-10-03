// Countries, places and Serbian city names. Pure data + lookups.
import { toCountrySlug } from "../../lib/country-route";
import { fold } from "./text";

export type Country = { name: string; code: string; europe: boolean; beach: boolean; aliases?: string[] };

// Serbian Latin names (as used in /putovanja/[zemlja] slugs via toCountrySlug).
export const COUNTRIES: Country[] = [
  { name: "Grčka", code: "GR", europe: true, beach: true, aliases: ["grcka", "greece", "halkidiki"] },
  { name: "Turska", code: "TR", europe: false, beach: true, aliases: ["turkey"] },
  { name: "Tunis", code: "TN", europe: false, beach: true, aliases: ["tunisia", "tunisija"] },
  { name: "Egipat", code: "EG", europe: false, beach: true, aliases: ["egypt"] },
  { name: "Crna Gora", code: "ME", europe: true, beach: true, aliases: ["montenegro"] },
  { name: "Bugarska", code: "BG", europe: true, beach: true, aliases: ["bulgaria"] },
  { name: "Albanija", code: "AL", europe: true, beach: true, aliases: ["albania"] },
  { name: "Hrvatska", code: "HR", europe: true, beach: true, aliases: ["croatia"] },
  { name: "Italija", code: "IT", europe: true, beach: true, aliases: ["italy", "italije"] },
  { name: "Španija", code: "ES", europe: true, beach: true, aliases: ["spain"] },
  { name: "Portugalija", code: "PT", europe: true, beach: true, aliases: ["portugal"] },
  { name: "Kipar", code: "CY", europe: true, beach: true, aliases: ["cyprus"] },
  { name: "Malta", code: "MT", europe: true, beach: true },
  { name: "Francuska", code: "FR", europe: true, beach: false, aliases: ["france"] },
  { name: "Nemačka", code: "DE", europe: true, beach: false, aliases: ["germany"] },
  { name: "Austrija", code: "AT", europe: true, beach: false, aliases: ["austria", "austrije"] },
  { name: "Švajcarska", code: "CH", europe: true, beach: false, aliases: ["switzerland"] },
  { name: "Mađarska", code: "HU", europe: true, beach: false, aliases: ["hungary"] },
  { name: "Češka", code: "CZ", europe: true, beach: false, aliases: ["czech", "ceska republika"] },
  { name: "Slovačka", code: "SK", europe: true, beach: false },
  { name: "Poljska", code: "PL", europe: true, beach: false, aliases: ["poland"] },
  { name: "Slovenija", code: "SI", europe: true, beach: false, aliases: ["slovenia"] },
  { name: "Bosna i Hercegovina", code: "BA", europe: true, beach: false, aliases: ["bih", "republika srpska"] },
  { name: "Severna Makedonija", code: "MK", europe: true, beach: false, aliases: ["makedonija"] },
  { name: "Srbija", code: "RS", europe: true, beach: false, aliases: ["serbia"] },
  { name: "Rumunija", code: "RO", europe: true, beach: false, aliases: ["romania"] },
  { name: "Holandija", code: "NL", europe: true, beach: false, aliases: ["holland", "netherlands"] },
  { name: "Belgija", code: "BE", europe: true, beach: false },
  { name: "Velika Britanija", code: "GB", europe: true, beach: false, aliases: ["engleska", "england", "uk"] },
  { name: "Irska", code: "IE", europe: true, beach: false },
  { name: "Danska", code: "DK", europe: true, beach: false },
  { name: "Švedska", code: "SE", europe: true, beach: false },
  { name: "Norveška", code: "NO", europe: true, beach: false },
  { name: "Finska", code: "FI", europe: true, beach: false },
  { name: "Island", code: "IS", europe: true, beach: false },
  { name: "Estonija", code: "EE", europe: true, beach: false },
  { name: "Letonija", code: "LV", europe: true, beach: false },
  { name: "Litvanija", code: "LT", europe: true, beach: false },
  { name: "Luksemburg", code: "LU", europe: true, beach: false },
  { name: "Monako", code: "MC", europe: true, beach: true },
  { name: "Rusija", code: "RU", europe: true, beach: false },
  { name: "Gruzija", code: "GE", europe: false, beach: false },
  { name: "Jermenija", code: "AM", europe: false, beach: false },
  { name: "Azerbejdžan", code: "AZ", europe: false, beach: false },
  { name: "Izrael", code: "IL", europe: false, beach: true },
  { name: "Jordan", code: "JO", europe: false, beach: false },
  { name: "Ujedinjeni Arapski Emirati", code: "AE", europe: false, beach: true, aliases: ["uae", "dubai", "emirati"] },
  { name: "Maroko", code: "MA", europe: false, beach: true },
  { name: "Tajland", code: "TH", europe: false, beach: true, aliases: ["thailand"] },
  { name: "Maldivi", code: "MV", europe: false, beach: true },
  { name: "Mauricijus", code: "MU", europe: false, beach: true },
  { name: "Dominikanska Republika", code: "DO", europe: false, beach: true, aliases: ["dominikana"] },
  { name: "Kuba", code: "CU", europe: false, beach: true },
  { name: "Meksiko", code: "MX", europe: false, beach: true },
  { name: "Sjedinjene Američke Države", code: "US", europe: false, beach: false, aliases: ["sad", "amerika", "usa"] },
  { name: "Kanada", code: "CA", europe: false, beach: false },
  { name: "Japan", code: "JP", europe: false, beach: false },
  { name: "Kina", code: "CN", europe: false, beach: false },
  { name: "Indija", code: "IN", europe: false, beach: false },
  { name: "Šri Lanka", code: "LK", europe: false, beach: true },
  { name: "Vijetnam", code: "VN", europe: false, beach: true },
  { name: "Indonezija", code: "ID", europe: false, beach: true, aliases: ["bali"] },
  { name: "Kenija", code: "KE", europe: false, beach: true },
  { name: "Tanzanija", code: "TZ", europe: false, beach: true, aliases: ["zanzibar"] },
  { name: "Južna Afrika", code: "ZA", europe: false, beach: false },
  { name: "Brazil", code: "BR", europe: false, beach: true },
  { name: "Argentina", code: "AR", europe: false, beach: false },
  { name: "Peru", code: "PE", europe: false, beach: false },
  { name: "Singapur", code: "SG", europe: false, beach: false },
  { name: "Seješeli", code: "SC", europe: false, beach: true },
];

// Resort/city → country code. Used only when an adapter gives no country.
const PLACE_COUNTRY: Record<string, string> = {};
const addPlaces = (code: string, places: string[]) => {
  for (const place of places) PLACE_COUNTRY[fold(place)] = code;
};
addPlaces("GR", [
  "Sarti", "Sarti Beach", "Sykia", "Sikia", "Klimataria", "Kalamitsi", "Porto Koufo", "Toroni", "Neos Marmaras",
  "Nikiti", "Metamorfosi", "Metamorfozis", "Psakoudia", "Nea Plaja", "Nea Plagia", "Polihrono", "Hanioti", "Pefkohori",
  "Kalitea", "Kallithea", "Paljuri", "Siviri", "Afitos", "Nea Potidea", "Kasandra", "Sitonija", "Atos", "Paralija",
  "Paralia", "Olympic Beach", "Leptokarija", "Leptokaria", "Nei Pori", "Asprovalta", "Nea Vrasna", "Vrasna", "Stavros",
  "Tasos", "Thassos", "Potos", "Limenas", "Krf", "Lefkada", "Nidri", "Parga", "Sivota", "Zakintos", "Kos", "Rodos",
  "Krit", "Evia", "Edipsos", "Skijatos", "Halkidiki", "Atina", "Solun", "Thessaloniki", "Vrahos", "Agios Nikitas",
  "Nea Flogita", "Skala Furka", "Posidi", "Kavala", "Pieria", "Pelion", "Peloponez", "Santorini", "Mikonos", "Krit",
]);
addPlaces("TR", ["Istanbul", "Kušadasi", "Kusadasi", "Sarimsakli", "Alanja", "Antalija", "Side", "Belek", "Kemer", "Bodrum", "Marmaris", "Didim", "Kapadokija"]);
addPlaces("TN", ["Hamamet", "Jasmin Hamamet", "Sus", "Sousse", "Mahdia", "Džerba", "Djerba", "Port El Kantaoui", "Monastir", "Skanes", "Gamart", "Tunis"]);
addPlaces("EG", ["Hurgada", "Hurghada", "Šarm el Šeik", "Sharm el Sheikh", "Makadi", "Marsa Alam", "Soma Bay", "Kairo"]);
addPlaces("ME", ["Budva", "Bečići", "Petrovac", "Čanj", "Sutomore", "Herceg Novi", "Kotor", "Ulcinj", "Dobre Vode", "Šušanj", "Rafailovići", "Bar", "Tivat", "Kolašin", "Žabljak"]);
addPlaces("BG", ["Bansko", "Borovec", "Pamporovo", "Sunčev Breg", "Nesebar", "Primorsko", "Sozopol", "Sveti Vlas", "Zlatni Pjasci", "Sofija", "Varna", "Kiten"]);
addPlaces("AL", ["Drač", "Ksamil", "Saranda", "Valona", "Tirana"]);
addPlaces("IT", ["Rim", "Venecija", "Firenca", "Toskana", "Milano", "Rimini", "Livinjo", "Livigno", "Passo Tonale", "Napulj", "Sicilija", "Verona", "Lido di Jesolo", "Trst"]);
addPlaces("ES", ["Barselona", "Madrid", "Andaluzija", "Malaga", "Sevilja", "Majorka", "Tenerife", "Kosta Brava", "Valensija"]);
addPlaces("FR", ["Pariz", "Azurna obala", "Nica", "Val Thorens", "Provansa", "Korzika", "Risoul"]);
addPlaces("AT", ["Beč", "Salcburg", "Insbruk"]);
addPlaces("CZ", ["Prag"]);
addPlaces("HU", ["Budimpešta", "Segedin"]);
addPlaces("PL", ["Krakov", "Varšava"]);
addPlaces("DE", ["Berlin", "Minhen", "Drezden"]);
addPlaces("NL", ["Amsterdam"]);
addPlaces("PT", ["Lisabon", "Porto"]);
addPlaces("RO", ["Temišvar", "Bukurešt", "Transilvanija", "Brašov", "Sibinj"]);
addPlaces("MK", ["Ohrid", "Skoplje", "Struga"]);
addPlaces("BA", ["Sarajevo", "Trebinje", "Banja Luka", "Jahorina", "Mostar", "Međugorje"]);
addPlaces("RS", ["Kopaonik", "Zlatibor", "Stara planina", "Sokobanja", "Vrnjačka Banja", "Tara"]);
addPlaces("HR", ["Istra", "Zagreb", "Dubrovnik", "Split", "Korčula", "Zrće"]);
addPlaces("SI", ["Ljubljana", "Bled", "Kranjska Gora"]);
addPlaces("AE", ["Dubai", "Abu Dabi"]);
addPlaces("TH", ["Bangkok", "Puket", "Krabi"]);

const BY_FOLD = new Map<string, Country>();
for (const country of COUNTRIES) {
  BY_FOLD.set(fold(country.name), country);
  for (const alias of country.aliases ?? []) BY_FOLD.set(fold(alias), country);
}
const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

/** Find a country by Serbian name, alias, ISO code or ALL-CAPS variant ("EGIPAT"). */
export function findCountry(value: string | undefined | null): Country | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^[A-Z]{2}$/.test(trimmed)) return BY_CODE.get(trimmed);
  return BY_FOLD.get(fold(trimmed));
}

export function countryByCode(code: string | undefined): Country | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined;
}

export function countryForPlace(place: string | undefined | null): Country | undefined {
  if (!place) return undefined;
  const code = PLACE_COUNTRY[fold(place)];
  return code ? BY_CODE.get(code) : undefined;
}

export function countrySlugOf(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const slug = toCountrySlug(name);
  return slug || undefined;
}

// Serbian genitive → nominative for departure cities ("Polazak iz Niša").
const CITY_NOMINATIVE: Record<string, string> = {
  beograda: "Beograd",
  nisa: "Niš",
  kraljeva: "Kraljevo",
  krusevca: "Kruševac",
  trstenika: "Trstenik",
  "vr. banje": "Vrnjačka Banja",
  "vrnjacke banje": "Vrnjačka Banja",
  cacka: "Čačak",
  kragujevca: "Kragujevac",
  uzica: "Užice",
  pozege: "Požega",
  "novog sada": "Novi Sad",
  "backe palanke": "Bačka Palanka",
  subotice: "Subotica",
  preljine: "Preljina",
  panceva: "Pančevo",
  smedereva: "Smederevo",
  jagodine: "Jagodina",
  leskovca: "Leskovac",
  valjeva: "Valjevo",
  sapca: "Šabac",
  zrenjanina: "Zrenjanin",
  sombora: "Sombor",
  kikinde: "Kikinda",
  vranja: "Vranje",
  pirota: "Pirot",
  zajecara: "Zaječar",
  "velike plane": "Velika Plana",
  cuprije: "Ćuprija",
  paracina: "Paraćin",
  aleksinca: "Aleksinac",
  mrcajevaca: "Mrčajevci",
};

const BEOGRAD_CODES: Record<string, string> = { BEG: "Beograd", INI: "Niš", KVO: "Kraljevo" };

export function nominativeCity(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, "");
  if (BEOGRAD_CODES[trimmed]) return BEOGRAD_CODES[trimmed];
  const hit = CITY_NOMINATIVE[fold(trimmed)];
  return hit ?? trimmed;
}

/** First known country (or place) mentioned in free text, e.g. "Ture Specijalna ponuda Španija ANDALUZIJSKA TURA". */
export function findCountryInText(text: string | undefined): Country | undefined {
  if (!text) return undefined;
  const folded = ` ${fold(text).replace(/[^a-z0-9 ]+/g, " ")} `;
  let best: { country: Country; index: number } | undefined;
  for (const country of COUNTRIES) {
    for (const name of [country.name, ...(country.aliases ?? [])]) {
      const index = folded.indexOf(` ${fold(name)} `);
      if (index >= 0 && (!best || index < best.index)) best = { country, index };
    }
  }
  return best?.country;
}

// Step 09: destinations seen in live partner lists (Rapsody, Big Blue).
addPlaces("DE", ["Dresden", "Drezden"]);
addPlaces("AT", ["Halštat", "Hallstatt"]);
addPlaces("ES", ["Ljoret de Mar", "Lloret de Mar", "Kosta Brava"]);
addPlaces("DO", ["Bayahibe", "Punta Kana", "Punta Cana"]);
addPlaces("GB", ["London"]);

/** City or resort at the start of a title ("Budimpešta Advent 2026", "Azurna obala (5 dana)"). */
export function placeFromText(text: string | undefined): { place: string; country: Country } | undefined {
  if (!text) return undefined;
  const words = text.replace(/\([^)]*\)/g, " ").split(/\s+/).filter(Boolean);
  for (let n = Math.min(3, words.length); n >= 1; n -= 1) {
    const candidate = words.slice(0, n).join(" ").replace(/[,.:;–-]+$/, "");
    const country = countryForPlace(candidate);
    if (country) return { place: candidate, country };
  }
  return undefined;
}
addPlaces("RO", ["Krajova", "Craiova", "Temišvar", "Temisvar", "Sibinj", "Brašov"]);
addPlaces("HU", ["Segedin", "Szeged", "Pečuj"]);
addPlaces("BA", ["Mostar", "Sarajevo", "Banja Luka", "Trebinje", "Višegrad"]);
addPlaces("SI", ["Maribor", "Ljubljana", "Bled", "Piran"]);
addPlaces("AT", ["Grac", "Graz", "Salcburg", "Salzburg", "Insbruk"]);
addPlaces("IT", ["Rimini", "Dolomiti", "Južni Tirol", "Ravena", "Verona", "Venecija"]);
