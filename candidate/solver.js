export async function solveChallenge(input) {
  const squadSize =
    input?.challenge?.squadSize ??
    input?.challenge?.squadSlots?.length ??
    11;
  const playerIds = (input?.players || [])
    .slice(0, squadSize)
    .map((player) => player.id);
  const hasChemistryRule = (input?.challenge?.requirementsNormalized || []).some(
    (rule) => rule?.type === "chemistry_points" || rule?.type === "all_players_chemistry_points",
  );

  return hasChemistryRule
    ? {
        playerIds,
        slotAssignments: playerIds,
        meta: {
          strategy: "replace this stub with a real solver",
        },
      }
    : {
        playerIds,
        meta: {
          strategy: "replace this stub with a real solver",
        },
      };
}

export default solveChallenge;
