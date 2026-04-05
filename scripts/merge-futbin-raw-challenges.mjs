import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packRoot = path.resolve(__dirname, "..");

const DEFAULT_CURRENT_PATH = path.resolve(
  packRoot,
  "OPEN-IN-LLM_EAFC-SBC-Solver-Workspace",
  "model-kit",
  "datasets",
  "challenges-v1.json",
);

const DEFAULT_PLAYERS_PATH = path.resolve(
  packRoot,
  "OPEN-IN-LLM_EAFC-SBC-Solver-Workspace",
  "model-kit",
  "datasets",
  "players-v1-flat.json",
);

// These raw Futbin club ids do not have a trustworthy mapping into the shipped
// player-pool teamId namespace, so keep them excluded unless a verified mapping
// is introduced later.
const DEFAULT_EXCLUDED_CHALLENGE_IDS = new Set([225, 1572]);

const USAGE = `
Merge a Futbin raw challenge export into the compiled challenge dataset.

Usage:
  node scripts/merge-futbin-raw-challenges.mjs --raw <file> [--current <file>] [--players <file>] [--out <file>] [--exclude <id,id,...>] [--print-only]
`;

const TYPE_SCOPE = {
  min: "GREATER",
  max: "LOWER",
  exact: "EXACT",
};

const QUALITY_BY_LABEL = new Map([
  ["gold", "gold"],
  ["silver", "silver"],
  ["bronze", "bronze"],
]);

const parseArgs = (argv) => {
  const args = {
    raw: null,
    current: DEFAULT_CURRENT_PATH,
    players: DEFAULT_PLAYERS_PATH,
    out: DEFAULT_CURRENT_PATH,
    exclude: new Set(DEFAULT_EXCLUDED_CHALLENGE_IDS),
    printOnly: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--print-only") {
      args.printOnly = true;
      continue;
    }
    if (token === "--raw") {
      args.raw = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--current") {
      args.current = argv[index + 1] ?? args.current;
      index += 1;
      continue;
    }
    if (token === "--players") {
      args.players = argv[index + 1] ?? args.players;
      index += 1;
      continue;
    }
    if (token === "--out") {
      args.out = argv[index + 1] ?? args.out;
      index += 1;
      continue;
    }
    if (token === "--exclude") {
      const rawIds = (argv[index + 1] ?? "")
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter(Number.isFinite);
      args.exclude = new Set([...DEFAULT_EXCLUDED_CHALLENGE_IDS, ...rawIds]);
      index += 1;
    }
  }

  return args;
};

const readJson = async (filePath) =>
  JSON.parse(await fs.readFile(filePath, "utf8"));

const writeJson = async (filePath, value) => {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const extractImageId = (image) => {
  const src = String(image?.src ?? "");
  const match = src.match(/\/(\d+)\.png(?:\?|$)/);
  return match ? Number.parseInt(match[1], 10) : null;
};

const parseBound = (label) => {
  const squadSizeMatch = label.match(/^# of players in squad:\s*(\d+)$/i);
  if (squadSizeMatch) {
    return {
      op: "exact",
      count: Number.parseInt(squadSizeMatch[1], 10),
      isSquadSize: true,
    };
  }

  const match = label.match(/:\s*(Min|Max)\s*(\d+)\s*$/i);
  if (!match) {
    throw new Error(`Unsupported requirement label: ${label}`);
  }

  return {
    op: match[1].toLowerCase(),
    count: Number.parseInt(match[2], 10),
    isSquadSize: false,
  };
};

const buildRequirementEntry = (label, count) => ({
  scope: null,
  count,
  isCombined: false,
  label,
  kvPairs: [],
});

const buildNormalizedRule = ({
  label,
  type,
  op,
  count,
  value,
  typeSource = "futbin-text",
}) => ({
  type,
  key: null,
  keyName: null,
  keyNameNormalized: type,
  typeSource,
  op,
  count,
  derivedCount: null,
  value,
  scope: null,
  scopeName: TYPE_SCOPE[op],
  label,
});

const resolveClubId = (image, playerTeamIds) => {
  const rawId = extractImageId(image);
  const rawTitle = String(image?.title ?? "");

  if (Number.isFinite(rawId) && playerTeamIds.has(rawId)) return rawId;

  throw new Error(
    `Unable to resolve club id for "${rawTitle}" from image "${image?.src ?? ""}"`,
  );
};

const resolveIdentityIds = (images, kind, playerTeamIds) => {
  if (kind === "club_id") {
    return images.map((image) => resolveClubId(image, playerTeamIds));
  }
  return images
    .map((image) => extractImageId(image))
    .filter(Number.isFinite);
};

const parseDetailedRequirement = (detail, playerTeamIds) => {
  const label = String(detail?.text ?? "").trim();
  const images = Array.isArray(detail?.images) ? detail.images : [];
  const imageKinds = [...new Set(images.map((image) => String(image?.alt ?? "").trim()).filter(Boolean))];

  const playerLevelMatch = label.match(/^Player Level:\s*Min\s*(Gold|Silver|Bronze)$/i);
  if (playerLevelMatch) {
    const quality = QUALITY_BY_LABEL.get(normalizeText(playerLevelMatch[1]));
    return {
      requirement: buildRequirementEntry(label, -1),
      normalized: buildNormalizedRule({
        label,
        type: "player_level",
        op: "min",
        count: -1,
        value: [quality],
      }),
    };
  }

  const bound = parseBound(label);
  const countValue = bound.count;

  if (bound.isSquadSize) {
    return {
      requirement: buildRequirementEntry(label, countValue),
      normalized: buildNormalizedRule({
        label,
        type: "players_in_squad",
        op: "exact",
        count: countValue,
        value: [countValue],
      }),
      squadSize: countValue,
    };
  }

  if (label.startsWith("# of players from ") && imageKinds.length === 1) {
    const kind = imageKinds[0];
    const type =
      kind === "Club"
        ? "club_id"
        : kind === "Nation"
          ? "nation_id"
          : kind === "League"
            ? "league_id"
            : null;
    if (!type) {
      throw new Error(`Unsupported identity requirement kind "${kind}" in "${label}"`);
    }
    const value = resolveIdentityIds(images, type, playerTeamIds);
    return {
      requirement: buildRequirementEntry(label, countValue),
      normalized: buildNormalizedRule({
        label,
        type,
        op: bound.op,
        count: countValue,
        value,
      }),
    };
  }

  const sameCountMatch = label.match(/^Same (Nation|League|Club) Count:/i);
  if (sameCountMatch) {
    const attr = sameCountMatch[1].toLowerCase();
    return {
      requirement: buildRequirementEntry(label, -1),
      normalized: buildNormalizedRule({
        label,
        type: `same_${attr}_count`,
        op: bound.op,
        count: -1,
        value: [countValue],
      }),
    };
  }

  const distinctCountMatch = label.match(/^(Nationalities|Leagues|Clubs):/i);
  if (distinctCountMatch) {
    const rawType = distinctCountMatch[1].toLowerCase();
    const type =
      rawType === "nationalities"
        ? "nation_count"
        : rawType === "leagues"
          ? "league_count"
          : "club_count";
    return {
      requirement: buildRequirementEntry(label, -1),
      normalized: buildNormalizedRule({
        label,
        type,
        op: bound.op,
        count: -1,
        value: [countValue],
      }),
    };
  }

  const qualityPlayersMatch = label.match(/^(Gold|Silver|Bronze) Players:\s*Min\s*(\d+)$/i);
  if (qualityPlayersMatch) {
    const quality = QUALITY_BY_LABEL.get(normalizeText(qualityPlayersMatch[1]));
    return {
      requirement: buildRequirementEntry(label, countValue),
      normalized: buildNormalizedRule({
        label,
        type: "player_level",
        op: "min",
        count: countValue,
        value: [quality],
      }),
    };
  }

  const ratingMatch = label.match(/^Squad Rating:\s*Min\s*(\d+)$/i);
  if (ratingMatch) {
    return {
      requirement: buildRequirementEntry(label, -1),
      normalized: buildNormalizedRule({
        label,
        type: "team_rating",
        op: "min",
        count: -1,
        value: [countValue],
      }),
    };
  }

  const chemistryMatch = label.match(/^Team Chemistry:\s*Min\s*(\d+)$/i);
  if (chemistryMatch) {
    return {
      requirement: buildRequirementEntry(label, -1),
      normalized: buildNormalizedRule({
        label,
        type: "chemistry_points",
        op: "min",
        count: -1,
        value: [countValue],
      }),
    };
  }

  const rareCompatMatch = label.match(/^Rare or TOTW:\s*Min\s*(\d+)$/i);
  if (rareCompatMatch) {
    return {
      requirement: buildRequirementEntry(label, countValue),
      normalized: buildNormalizedRule({
        label,
        type: "player_rarity_or_totw",
        op: "min",
        count: countValue,
        value: ["rare_or_totw"],
        typeSource: "futbin-text-rare-compat",
      }),
    };
  }

  const rareGroupMatch = label.match(
    /^Gold Rare or Silver Rare or Bronze Rare Players:\s*Min\s*(\d+)$/i,
  );
  if (rareGroupMatch) {
    return {
      requirement: buildRequirementEntry(label, countValue),
      normalized: buildNormalizedRule({
        label,
        type: "player_rarity_group",
        op: "min",
        count: countValue,
        value: ["rare"],
      }),
    };
  }

  throw new Error(`Unsupported requirement label: ${label}`);
};

const buildChallengeRecord = (group, challenge, playerTeamIds) => {
  const requirements = [];
  const requirementsNormalized = [];
  let squadSize = Array.isArray(challenge?.squadSlots) ? challenge.squadSlots.length : 11;

  for (const detail of challenge?.requirementsDetailed ?? []) {
    const parsed = parseDetailedRequirement(detail, playerTeamIds);
    requirements.push(parsed.requirement);
    requirementsNormalized.push(parsed.normalized);
    if (Number.isFinite(parsed.squadSize)) {
      squadSize = parsed.squadSize;
    }
  }

  return {
    source: "futbin",
    fidelity: "parsed-text",
    challengeId: Number.parseInt(challenge.eaChallengeId, 10),
    setId: Number.parseInt(group.futbinGroupId, 10),
    setIdSource: "futbin_group",
    setName: group.groupName,
    challengeName: challenge.challengeName,
    openedAt: null,
    challengeStatus: "UNKNOWN",
    squadSize,
    formationName: challenge.formationName,
    formationCode: challenge.formationCode,
    slotSource: challenge.formationSource ?? "challenge-react-data",
    squadSlots: challenge.squadSlots ?? [],
    requirementsText: challenge.requirementsText ?? [],
    requirements,
    requirementsRaw: [],
    requirementsNormalized,
    challengeUrl: challenge.challengeUrl,
    groupUrl: group.groupUrl ?? null,
  };
};

export const buildMergedChallengeDataset = ({
  currentDataset,
  rawExport,
  players,
  excludeChallengeIds = [],
}) => {
  const existingIds = new Set(
    (currentDataset?.challenges ?? []).map((challenge) => challenge.challengeId),
  );
  const excludedIds = new Set(
    [...excludeChallengeIds].map((value) => Number.parseInt(value, 10)).filter(Number.isFinite),
  );
  const playerTeamIds = new Set((players ?? []).map((player) => player.teamId));

  const additions = [];
  for (const group of rawExport?.groups ?? []) {
    for (const challenge of group?.challenges ?? []) {
      const challengeId = Number.parseInt(challenge?.eaChallengeId, 10);
      if (!Number.isFinite(challengeId)) continue;
      if (existingIds.has(challengeId)) continue;
      if (excludedIds.has(challengeId)) continue;
      additions.push(buildChallengeRecord(group, challenge, playerTeamIds));
    }
  }

  additions.sort((left, right) => right.challengeId - left.challengeId);

  return {
    merged: {
      ...currentDataset,
      challengeCount: (currentDataset?.challenges?.length ?? 0) + additions.length,
      challenges: [...(currentDataset?.challenges ?? []), ...additions],
    },
    additions,
  };
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE.trim());
    return;
  }
  if (!args.raw) {
    throw new Error("Missing --raw <file>");
  }

  const [currentDataset, rawExport, players] = await Promise.all([
    readJson(path.resolve(args.current)),
    readJson(path.resolve(args.raw)),
    readJson(path.resolve(args.players)),
  ]);

  const { merged, additions } = buildMergedChallengeDataset({
    currentDataset,
    rawExport,
    players,
    excludeChallengeIds: args.exclude,
  });

  if (args.printOnly) {
    console.log(
      JSON.stringify(
        additions.map((challenge) => ({
          challengeId: challenge.challengeId,
          challengeName: challenge.challengeName,
          setName: challenge.setName,
        })),
        null,
        2,
      ),
    );
    return;
  }

  await writeJson(path.resolve(args.out), merged);
  console.log(
    `Added ${additions.length} challenges. challengeCount=${merged.challengeCount}. ids=${additions
      .map((challenge) => challenge.challengeId)
      .join(",")}`,
  );
};

const isEntrypoint =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === __filename;

if (isEntrypoint) {
  run().catch((error) => {
    console.error(error?.message || error);
    process.exitCode = 1;
  });
}
