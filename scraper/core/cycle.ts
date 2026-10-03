// Sync cycle rules (D7), pure: the daily automatic run at 06:00 Europe/Belgrade
// and the one manual run per cycle. Used by Convex mutations/queries and tests.
import { cycleKeyOf, isCronHour, nextSlotAt } from "./time";

export const CRON_MAX_RETRIES = 6;
export const CRON_RETRY_MS = 10 * 60 * 1000;

export type CronDecision = "disabled" | "not_cron_hour" | "already_ran" | "retry_later" | "give_up" | "start";

/**
 * Two UTC crons (04:00 and 05:00) cover CEST and CET; only the one that lands
 * on 06:00 Belgrade starts a run, once per cycle. A busy run postpones the
 * start by 10 minutes, at most 6 times.
 */
export function cronDecision(opts: {
  now: number;
  enabled: boolean;
  running: boolean;
  lastAutoCycleKey?: string;
  retry?: number;
}): CronDecision {
  if (!opts.enabled) return "disabled";
  const retry = opts.retry ?? 0;
  if (retry === 0 && !isCronHour(opts.now)) return "not_cron_hour";
  if (opts.lastAutoCycleKey === cycleKeyOf(opts.now)) return "already_ran";
  if (opts.running) return retry >= CRON_MAX_RETRIES ? "give_up" : "retry_later";
  return "start";
}

export type ManualRunState = {
  available: boolean;
  reason: null | "running" | "used_this_cycle";
  /** UTC ms when the button unlocks; null while a run is in progress (unknown end). */
  lockedUntil: number | null;
};

/** One manual run per cycle; locked while any run is active and until the next 06:00 after use. */
export function manualRunState(opts: { now: number; running: boolean; lastManualCycleKey?: string }): ManualRunState {
  if (opts.running) return { available: false, reason: "running", lockedUntil: null };
  if (opts.lastManualCycleKey === cycleKeyOf(opts.now)) {
    return { available: false, reason: "used_this_cycle", lockedUntil: nextSlotAt(opts.now) };
  }
  return { available: true, reason: null, lockedUntil: null };
}
