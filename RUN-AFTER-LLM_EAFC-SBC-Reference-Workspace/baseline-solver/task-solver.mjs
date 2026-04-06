import { buildSolverContext, solveSquad } from "./solver.js";

const hasChemistryRule = (challenge) =>
  (challenge?.requirementsNormalized || []).some(
    (rule) =>
      rule?.type === "chemistry_points" ||
      rule?.type === "all_players_chemistry_points",
  );

export async function solveChallenge(input) {
  const challenge = input?.challenge ?? null;
  const players = Array.isArray(input?.players) ? input.players : [];

  const context = buildSolverContext({
    players,
    requirementsNormalized: challenge?.requirementsNormalized || [],
    requiredPlayers: challenge?.squadSize ?? null,
    squadSlots: challenge?.squadSlots || null,
  });

  const result = solveSquad(context);
  const playerIds = Array.isArray(result?.solutions?.[0]) ? result.solutions[0] : [];
  if (!playerIds.length) return [];

  if (!hasChemistryRule(challenge)) {
    return playerIds;
  }

  const slotAssignments = Array.isArray(
    result?.solutionSlots?.[0]?.fieldSlotToPlayerId,
  )
    ? result.solutionSlots[0].fieldSlotToPlayerId
    : playerIds;

  return {
    playerIds,
    slotAssignments,
  };
}

export default solveChallenge;
