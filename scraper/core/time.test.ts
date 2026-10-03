import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  belgradeDateKey,
  belgradeOffsetMinutes,
  cycleKeyOf,
  diffDaysIso,
  isBeforeTodayBelgrade,
  isCronHour,
  lastSlotAt,
  nextSlotAt,
} from "./time";

const at = (iso: string) => Date.parse(iso);
const iso = (ms: number) => new Date(ms).toISOString();

describe("Belgrade time", () => {
  it("knows CEST and CET around the 2026 switches", () => {
    expect(belgradeOffsetMinutes(at("2026-10-01T10:00:00Z"))).toBe(120);
    expect(belgradeOffsetMinutes(at("2026-10-25T00:59:00Z"))).toBe(120);
    expect(belgradeOffsetMinutes(at("2026-10-25T01:00:00Z"))).toBe(60);
    expect(belgradeOffsetMinutes(at("2027-03-28T00:59:00Z"))).toBe(60);
    expect(belgradeOffsetMinutes(at("2027-03-28T01:00:00Z"))).toBe(120);
  });

  it("computes the local date", () => {
    expect(belgradeDateKey(at("2026-10-01T22:30:00Z"))).toBe("2026-10-02");
    expect(belgradeDateKey(at("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  it("finds 06:00 slots and cycle keys", () => {
    expect(iso(lastSlotAt(at("2026-10-01T10:00:00Z")))).toBe("2026-10-01T04:00:00.000Z");
    expect(iso(nextSlotAt(at("2026-10-01T10:00:00Z")))).toBe("2026-10-02T04:00:00.000Z");
    expect(cycleKeyOf(at("2026-10-01T10:00:00Z"))).toBe("2026-10-01");
    expect(cycleKeyOf(at("2026-10-01T03:59:00Z"))).toBe("2026-09-30");
    expect(iso(lastSlotAt(at("2026-10-25T04:30:00Z")))).toBe("2026-10-24T04:00:00.000Z");
    expect(iso(nextSlotAt(at("2026-10-25T04:30:00Z")))).toBe("2026-10-25T05:00:00.000Z");
    expect(iso(nextSlotAt(at("2027-03-27T12:00:00Z")))).toBe("2027-03-28T04:00:00.000Z");
  });

  it("gates the two UTC crons to 06:00 Belgrade", () => {
    expect(isCronHour(at("2026-10-02T04:00:00Z"))).toBe(true);
    expect(isCronHour(at("2026-10-02T05:00:00Z"))).toBe(false);
    expect(isCronHour(at("2026-11-02T04:00:00Z"))).toBe(false);
    expect(isCronHour(at("2026-11-02T05:00:00Z"))).toBe(true);
  });

  it("does ISO date arithmetic", () => {
    expect(addDaysIso("2026-12-30", 3)).toBe("2027-01-02");
    expect(diffDaysIso("2026-10-02", "2026-10-09")).toBe(7);
  });
});

describe("isBeforeTodayBelgrade", () => {
  // 2026-10-01 00:30 in Belgrade is still 2026-09-30 in UTC.
  const now = at("2026-09-30T22:30:00Z");
  it("compares calendar days in Belgrade", () => {
    expect(isBeforeTodayBelgrade("2026-09-30", now)).toBe(true);
    expect(isBeforeTodayBelgrade("2026-10-01", now)).toBe(false);
    expect(isBeforeTodayBelgrade("2026-10-01T08:00:00Z", now)).toBe(false);
  });
  it("never treats missing or free-text dates as past", () => {
    expect(isBeforeTodayBelgrade(undefined, now)).toBe(false);
    expect(isBeforeTodayBelgrade("", now)).toBe(false);
    expect(isBeforeTodayBelgrade("na upit", now)).toBe(false);
  });
});
