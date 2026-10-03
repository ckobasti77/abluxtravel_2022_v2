import { describe, expect, it } from "vitest";
import { cronDecision, manualRunState } from "./cycle";

const at = (iso: string) => Date.parse(iso);

describe("cron decision (06:00 Europe/Belgrade)", () => {
  it("starts only in the Belgrade 06 hour, once per cycle", () => {
    // 2026-10-02 is CEST: 04:00 UTC = 06:00 Belgrade, 05:00 UTC = 07:00
    expect(cronDecision({ now: at("2026-10-02T04:00:00Z"), enabled: true, running: false })).toBe("start");
    expect(cronDecision({ now: at("2026-10-02T05:00:00Z"), enabled: true, running: false })).toBe("not_cron_hour");
    // 2026-11-02 is CET: 05:00 UTC = 06:00 Belgrade
    expect(cronDecision({ now: at("2026-11-02T05:00:00Z"), enabled: true, running: false })).toBe("start");
    expect(cronDecision({ now: at("2026-10-02T04:00:00Z"), enabled: true, running: false, lastAutoCycleKey: "2026-10-02" })).toBe("already_ran");
  });

  it("respects the switch and postpones while a run is active", () => {
    expect(cronDecision({ now: at("2026-10-02T04:00:00Z"), enabled: false, running: false })).toBe("disabled");
    expect(cronDecision({ now: at("2026-10-02T04:00:00Z"), enabled: true, running: true })).toBe("retry_later");
    // retries are allowed outside the 06 hour
    expect(cronDecision({ now: at("2026-10-02T05:05:00Z"), enabled: true, running: false, retry: 3 })).toBe("start");
    expect(cronDecision({ now: at("2026-10-02T05:05:00Z"), enabled: true, running: true, retry: 6 })).toBe("give_up");
  });
});

describe("manual run cooldown", () => {
  it("is available once per cycle and unlocks at the next 06:00", () => {
    const now = at("2026-10-01T07:53:00Z"); // 09:53 Belgrade
    expect(manualRunState({ now, running: false })).toEqual({ available: true, reason: null, lockedUntil: null });
    expect(manualRunState({ now, running: false, lastManualCycleKey: "2026-10-01" })).toEqual({
      available: false,
      reason: "used_this_cycle",
      lockedUntil: at("2026-10-02T04:00:00Z"),
    });
    // a manual run before 06:00 belongs to the previous cycle
    expect(manualRunState({ now: at("2026-10-02T03:30:00Z"), running: false, lastManualCycleKey: "2026-10-01" }).lockedUntil).toBe(at("2026-10-02T04:00:00Z"));
    expect(manualRunState({ now: at("2026-10-02T04:00:01Z"), running: false, lastManualCycleKey: "2026-10-01" }).available).toBe(true);
  });

  it("is locked while a run is in progress", () => {
    expect(manualRunState({ now: at("2026-10-01T10:00:00Z"), running: true })).toEqual({ available: false, reason: "running", lockedUntil: null });
  });
});
