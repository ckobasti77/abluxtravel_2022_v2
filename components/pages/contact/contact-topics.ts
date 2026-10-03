// Shared by the server page (?tema=) and the client form; kept out of the "use client" module.

export const CONTACT_TOPICS = ["verski-turizam", "letovanje", "evropske-ture", "rent-a-bus", "drugo"] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

/** Topic labels stored with the inquiry (Serbian, for the office) and shown in the select. */
export const CONTACT_TOPIC_LABELS: Record<ContactTopic, { sr: string; en: string }> = {
  "verski-turizam": { sr: "Verski turizam", en: "Religious travel" },
  letovanje: { sr: "Letovanje", en: "Summer holiday" },
  "evropske-ture": { sr: "Evropske ture", en: "European tours" },
  "rent-a-bus": { sr: "Rent a bus", en: "Rent a bus" },
  drugo: { sr: "Drugo", en: "Other" },
};

export const isContactTopic = (value: unknown): value is ContactTopic =>
  typeof value === "string" && (CONTACT_TOPICS as readonly string[]).includes(value);

export type ContactSettings = {
  address: string;
  phone: string;
  email: string;
  instagramUrl: string;
  workingHours: string;
  licenseNumber: string;
};
