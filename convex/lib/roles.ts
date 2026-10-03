// Pure role helpers, shared by Convex functions and client components.

export const ROLES = ["customer", "editor", "owner"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { customer: 0, editor: 1, owner: 2 };

// Legacy values ("admin", "user") and unknown values never grant rights by
// themselves; only an explicit "owner"/"editor" does.
export function normalizeRole(value: unknown): Role {
  if (value === "owner" || value === "editor" || value === "customer") return value;
  return "customer";
}

export const hasRole = (role: unknown, min: Role) => RANK[normalizeRole(role)] >= RANK[min];

export const isStaffRole = (role: unknown) => hasRole(role, "editor");

export const ROLE_LABELS: Record<Role, { sr: string; en: string }> = {
  owner: { sr: "Vlasnik", en: "Owner" },
  editor: { sr: "Urednik", en: "Editor" },
  customer: { sr: "Korisnik", en: "Customer" },
};
