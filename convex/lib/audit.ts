import type { MutationCtx } from "../_generated/server";
import type { Viewer } from "./access";

export type AuditEntry = {
  action: string;
  targetTable?: string;
  targetId?: string;
  // Short and free of customer PII (no emails, names or phone numbers).
  summary?: string;
};

export async function audit(ctx: MutationCtx, viewer: Viewer | null, entry: AuditEntry) {
  await ctx.db.insert("auditLog", {
    actorId: viewer?.userId,
    actorEmail: viewer?.email,
    actorRole: viewer?.role,
    action: entry.action,
    targetTable: entry.targetTable,
    targetId: entry.targetId,
    summary: entry.summary?.slice(0, 200),
    at: Date.now(),
  });
}
