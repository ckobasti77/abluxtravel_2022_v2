// Display names of users (staff lists, inbox assignees, note authors).
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { deriveNameFromEmail } from "./passwords";

export function profileNames(user: Doc<"users">) {
  const email = user.email ?? user.username ?? "";
  let firstName = user.firstName?.trim() ?? "";
  let lastName = user.lastName?.trim() ?? "";
  if (!firstName && !lastName && user.name?.trim()) {
    const [first, ...rest] = user.name.trim().split(/\s+/);
    firstName = first ?? "";
    lastName = rest.join(" ");
  }
  if (!firstName && !lastName) ({ firstName, lastName } = deriveNameFromEmail(email));
  const displayName = `${firstName} ${lastName}`.trim() || email;
  return { email, firstName, lastName, displayName };
}

/** id → display name for a handful of users (note authors, assignees). */
export async function namesById(ctx: QueryCtx, ids: Iterable<Id<"users"> | undefined>) {
  const names = new Map<string, string>();
  for (const id of new Set([...ids].filter((value): value is Id<"users"> => Boolean(value)))) {
    const user = await ctx.db.get(id);
    names.set(id, user ? profileNames(user).displayName : "Bivši korisnik");
  }
  return names;
}
