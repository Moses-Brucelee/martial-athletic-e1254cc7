import { describe, it, expect } from "vitest";
import { groupTeamsByDivision } from "@/modules/tournaments/components/HeatLaneAssigner";
import type { Team } from "@/domain/competition";

const baseTeam = (overrides: Partial<Team>): Team => ({
  id: overrides.id ?? "00000000-0000-0000-0000-000000000000",
  competition_id: "comp-1",
  team_name: overrides.team_name ?? "Team",
  division: overrides.division ?? null,
  division_id: null,
  captain_user_id: null,
  invite_code: null,
  is_complete: true,
  created_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("groupTeamsByDivision", () => {
  it("groups teams alphabetically by division", () => {
    const teams: Team[] = [
      baseTeam({ id: "t1", team_name: "Alpha", division: "M/M RX" }),
      baseTeam({ id: "t2", team_name: "Bravo", division: "F/F RX" }),
      baseTeam({ id: "t3", team_name: "Charlie", division: "M/M RX" }),
    ];

    const groups = groupTeamsByDivision(teams);

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("F/F RX");
    expect(groups[0].teams.map((t) => t.team_name)).toEqual(["Bravo"]);
    expect(groups[1].label).toBe("M/M RX");
    expect(groups[1].teams.map((t) => t.team_name)).toEqual(["Alpha", "Charlie"]);
  });

  it("places unassigned teams in an 'Other / Unassigned' fallback group last", () => {
    const teams: Team[] = [
      baseTeam({ id: "t1", team_name: "Zulu", division: "M/M Intermediate" }),
      baseTeam({ id: "t2", team_name: "Yankee", division: null }),
      baseTeam({ id: "t3", team_name: "X-ray", division: "   " }),
    ];

    const groups = groupTeamsByDivision(teams);

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("M/M Intermediate");
    expect(groups[1].label).toBe("Other / Unassigned");
    expect(groups[1].teams.map((t) => t.team_name)).toEqual(["Yankee", "X-ray"]);
  });

  it("returns an empty array when no teams are available", () => {
    expect(groupTeamsByDivision([])).toEqual([]);
  });

  it("handles a single all-unassigned set", () => {
    const teams: Team[] = [baseTeam({ id: "t1", team_name: "Solo", division: null })];
    const groups = groupTeamsByDivision(teams);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Other / Unassigned");
    expect(groups[0].teams).toHaveLength(1);
  });
});
