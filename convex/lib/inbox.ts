// Shared inbox rules for inquiries and orders (/admin/upiti, step 13):
// assignee (active staff only) and append-only staff notes.
import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { hasRole, normalizeRole } from "./roles";

export const NOTE_MAX = 2000;

type Note = { at: number; by: Id<"users">; text: string };

/** Patch for assignee and note (the caller sets its own status); summary has no personal data. */
export async function inboxPatch(
  ctx: MutationCtx,
  by: Id<"users">,
  row: { status: string; notes?: Note[] },
  args: { status?: string; assigneeId?: string | null; note?: string }
) {
  const now = Date.now();
  const fields: { assigneeId?: Id<"users"> | undefined; notes?: Note[]; updatedAt: number } = { updatedAt: now };
  const changed: string[] = [];
  if (args.status !== undefined && args.status !== row.status) changed.push(`status ${row.status} → ${args.status}`);
  if (args.assigneeId !== undefined) {
    if (args.assigneeId === null) {
      fields.assigneeId = undefined;
    } else {
      const assigneeId = ctx.db.normalizeId("users", args.assigneeId);
      const assignee = assigneeId ? await ctx.db.get(assigneeId) : null;
      if (!assignee || assignee.disabled || !hasRole(normalizeRole(assignee.role), "editor")) throw new ConvexError("INVALID_ASSIGNEE");
      fields.assigneeId = assignee._id;
    }
    changed.push("zaduženje");
  }
  if (args.note !== undefined) {
    const note = args.note.trim();
    if (!note || note.length > NOTE_MAX) throw new ConvexError("INVALID_NOTE");
    fields.notes = [...(row.notes ?? []), { at: now, by, text: note }];
    changed.push("beleška");
  }
  return { fields, summary: changed.join(", ") || "bez izmena" };
}
