import { describe, it, expect } from "vitest";
import {
  rangesOverlap,
  heatRange,
  parseWindow,
  validateWithinCompetition,
  findLaneConflict,
  nextHeatStart,
  availableLanes,
  addMinutes,
  type LaneUsage,
} from "@/lib/scheduling";
import { validateCompetitionDates } from "@/lib/validation";

const iso = (s: string) => new Date(s).toISOString();
const window = parseWindow(iso("2026-10-04T09:00:00"), iso("2026-10-05T18:00:00"));

const heat1 = {
  id: "h1",
  heat_number: 1,
  scheduled_start: iso("2026-10-04T09:00:00"),
  duration_minutes: 30,
  lane_count: 2,
};
const usage: LaneUsage = new Map([["h1", [1]]]);

const rangeAt = (start: string, mins: number) => ({
  start: new Date(start),
  end: addMinutes(new Date(start), mins),
});

describe("overlap detection", () => {
  it("detects identical and partial overlaps", () => {
    const base = heatRange(heat1)!;
    expect(rangesOverlap(rangeAt("2026-10-04T09:00:00", 30), base)).toBe(true);
    expect(rangesOverlap(rangeAt("2026-10-04T09:15:00", 30), base)).toBe(true);
    expect(rangesOverlap(rangeAt("2026-10-04T08:45:00", 30), base)).toBe(true);
    expect(rangesOverlap(rangeAt("2026-10-04T08:30:00", 90), base)).toBe(true);
  });

  it("treats back-to-back slots as free", () => {
    expect(rangesOverlap(rangeAt("2026-10-04T09:30:00", 30), heatRange(heat1)!)).toBe(false);
  });
});

describe("lane conflicts", () => {
  it("blocks the same lane and allows a different lane", () => {
    const range = rangeAt("2026-10-04T09:15:00", 30);
    expect(findLaneConflict({ range, lanes: [1], heats: [heat1], laneUsage: usage })?.lane).toBe(1);
    expect(findLaneConflict({ range, lanes: [2], heats: [heat1], laneUsage: usage })).toBeNull();
  });

  it("excludes the heat being edited", () => {
    const range = rangeAt("2026-10-04T09:00:00", 30);
    expect(
      findLaneConflict({ range, lanes: [1], heats: [heat1], laneUsage: usage, excludeHeatId: "h1" }),
    ).toBeNull();
  });

  it("lists free lanes", () => {
    const range = rangeAt("2026-10-04T09:00:00", 30);
    expect(availableLanes(3, { range, heats: [heat1], laneUsage: usage })).toEqual([2, 3]);
  });
});

describe("competition window", () => {
  it("rejects heats outside the range", () => {
    expect(validateWithinCompetition(rangeAt("2026-10-04T08:00:00", 30), window)).toMatch(/before/);
    expect(validateWithinCompetition(rangeAt("2026-10-05T17:45:00", 30), window)).toMatch(/after/);
    expect(validateWithinCompetition(rangeAt("2026-10-05T09:00:00", 30), window)).toBeNull();
  });
});

describe("smart defaults", () => {
  it("uses the competition start for the first heat", () => {
    expect(nextHeatStart([], window, 30)?.toISOString()).toBe(iso("2026-10-04T09:00:00"));
  });

  it("uses the end of the latest heat afterwards", () => {
    expect(nextHeatStart([heat1], window, 30)?.toISOString()).toBe(iso("2026-10-04T09:30:00"));
  });
});

describe("competition date rules", () => {
  const future = (days: number) => new Date(Date.now() + days * 86400000);

  it("rejects past deadlines and deadlines after start", () => {
    expect(validateCompetitionDates(future(10), future(11), new Date(Date.now() - 1000)).regDeadline)
      .toMatch(/past/);
    expect(validateCompetitionDates(future(10), future(11), future(10.5)).regDeadline)
      .toMatch(/before the competition start/);
  });

  it("allows same-day competitions with a later end time", () => {
    const start = future(10);
    const end = new Date(start.getTime() + 3600_000);
    const errs = validateCompetitionDates(start, end, future(5));
    expect(errs.endDate).toBeUndefined();
    expect(errs.regDeadline).toBeUndefined();
  });

  it("rejects an end before the start", () => {
    const start = future(10);
    expect(validateCompetitionDates(start, new Date(start.getTime() - 3600_000), future(5)).endDate)
      .toBeTruthy();
  });
});
