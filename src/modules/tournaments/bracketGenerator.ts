// Pure bracket generation logic — no framework or DB imports

export interface BracketParticipant {
  teamId: string;
  teamName: string;
  divisionId: string | null;
}

export interface GeneratedBout {
  round_number: number;
  bout_number: number;
  team_a_id: string | null;
  team_b_id: string | null;
  status: string;
}

export interface GeneratedBracket {
  name: string;
  division_id: string | null;
  bracket_type: string;
  bouts: GeneratedBout[];
}

/**
 * Generate single-elimination brackets grouped by division.
 * Each division produces one bracket.
 */
export function generateBrackets(
  participants: BracketParticipant[],
): GeneratedBracket[] {
  // Group by division
  const groups = new Map<string | null, BracketParticipant[]>();
  for (const p of participants) {
    const key = p.divisionId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const brackets: GeneratedBracket[] = [];

  for (const [divisionId, members] of groups) {
    if (members.length < 2) continue;

    const bracketName = divisionId
      ? `Division Bracket`
      : "Open Bracket";

    const bouts = generateSingleEliminationBouts(members);
    brackets.push({
      name: bracketName,
      division_id: divisionId,
      bracket_type: "single_elimination",
      bouts,
    });
  }

  return brackets;
}

function generateSingleEliminationBouts(
  participants: BracketParticipant[],
): GeneratedBout[] {
  const n = participants.length;
  const totalRounds = Math.ceil(Math.log2(n));
  const bracketSize = Math.pow(2, totalRounds);
  const byeCount = bracketSize - n;

  // Sequential seeding
  const seeds: (BracketParticipant | null)[] = [...participants];
  for (let i = 0; i < byeCount; i++) {
    seeds.push(null);
  }

  const bouts: GeneratedBout[] = [];

  // Round 1 matchups
  const round1Matches = bracketSize / 2;
  let boutNumber = 1;

  for (let i = 0; i < round1Matches; i++) {
    const teamA = seeds[i * 2];
    const teamB = seeds[i * 2 + 1];

    const isBye = !teamA || !teamB;

    bouts.push({
      round_number: 1,
      bout_number: boutNumber++,
      team_a_id: teamA?.teamId ?? null,
      team_b_id: teamB?.teamId ?? null,
      status: isBye ? "bye" : "pending",
    });
  }

  // Subsequent rounds — empty slots, filled as winners advance
  let matchesInRound = round1Matches / 2;
  for (let round = 2; round <= totalRounds; round++) {
    for (let i = 0; i < matchesInRound; i++) {
      bouts.push({
        round_number: round,
        bout_number: i + 1,
        team_a_id: null,
        team_b_id: null,
        status: "pending",
      });
    }
    matchesInRound /= 2;
  }

  return bouts;
}
