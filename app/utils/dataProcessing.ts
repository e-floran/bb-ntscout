/* eslint-disable @typescript-eslint/no-explicit-any */
// Utility functions for data processing

// Utility to humanize camelCase/PascalCase for display
export function humanize(str: string) {
  if (!str) return "";
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// Strategy groups
export const INTERIOR_OFFENSES = ["Look Inside", "Low Post"];
export const NEUTRAL_OFFENSES = [
  "Base",
  "Push",
  "Patient",
  "Outside Isolation",
  "Inside Isolation",
];
export const EXTERIOR_OFFENSES = ["Motion", "Run And Gun", "Princeton"];

export function stratRows(
  strats: Record<string, number>[] = []
): [string, ...(number | "")[]][] {
  // Get all unique strategy names from all seasons
  const allKeys = Array.from(
    new Set(
      strats
        .map((obj) => Object.keys(obj || {}))
        .reduce((a, b) => a.concat(b), [])
    )
  );
  return allKeys.map((strat) => [
    humanize(strat),
    ...strats.map((obj) => obj?.[strat] ?? ""),
  ]);
}

export function avgRows(
  avgs: Record<string, number>[] = []
): [string, ...(string | "")[]][] {
  const allCats = Array.from(
    new Set(
      avgs
        .map((obj) => Object.keys(obj || {}))
        .reduce((a, b) => a.concat(b), [])
    )
  );
  return allCats.map((cat) => [
    humanize(cat),
    ...avgs.map((obj) => (obj?.[cat] !== undefined ? obj[cat].toFixed(2) : "")),
  ]);
}

type Position = "PG" | "SG" | "SF" | "PF" | "C";
export function effRows(
  effs: Partial<Record<Position, number>>[] = []
): [string, ...(string | "")[]][] {
  return (["PG", "SG", "SF", "PF", "C"] as Position[]).map((pos) => [
    pos,
    ...effs.map((eff) =>
      eff?.[pos] !== undefined ? eff[pos]!.toFixed(1) : ""
    ),
  ]);
}

export function playerRows(stats = {}) {
  return Object.values(stats)
    .filter((s: any) => s.games > 0)
    .map((s: any) => {
      const games = s.games || 1; // Avoid division by zero

      // Calculate shooting averages
      const avgFGM = s.games > 0 && s.fgm !== undefined ? s.fgm / s.games : 0;
      const avgFGA = s.games > 0 && s.fga !== undefined ? s.fga / s.games : 0;
      const avgTPM = s.games > 0 && s.tpm !== undefined ? s.tpm / s.games : 0;
      const avgTPA = s.games > 0 && s.tpa !== undefined ? s.tpa / s.games : 0;

      // Calculate FG% and create FG M-A display
      const fgPercentage =
        s.fga && s.fga > 0
          ? ((s.fgm / s.fga) * 100).toFixed(1) + "%"
          : s.fgm !== undefined
          ? "0.0%"
          : "N/A";

      const fgDisplay =
        s.fgm !== undefined && s.fga !== undefined
          ? `${avgFGM.toFixed(1)}-${avgFGA.toFixed(1)}`
          : "N/A";

      // Calculate 3P% and create 3P M-A display
      const tpPercentage =
        s.tpa && s.tpa > 0
          ? ((s.tpm / s.tpa) * 100).toFixed(1) + "%"
          : s.tpm !== undefined
          ? "0.0%"
          : "N/A";

      const tpDisplay =
        s.tpm !== undefined && s.tpa !== undefined
          ? `${avgTPM.toFixed(1)}-${avgTPA.toFixed(1)}`
          : "N/A";

      return [
        s.name, // 0: Player name
        s.games, // 1: Games played
        (s.pts / games).toFixed(1), // 2: Points per game
        fgPercentage, // 3: FG%
        fgDisplay, // 4: FG M-A (display)
        tpPercentage, // 5: 3P%
        tpDisplay, // 6: 3P M-A (display)
        (s.ast / games).toFixed(1), // 7: Assists per game
        (s.reb / games).toFixed(1), // 8: Rebounds per game
        (s.blk / games).toFixed(1), // 9: Blocks per game
        (s.stl / games).toFixed(1), // 10: Steals per game
        (s.to / games).toFixed(1), // 11: Turnovers per game
        (s.pf / games).toFixed(1), // 12: Personal fouls per game
        (s.min / games).toFixed(1), // 13: Minutes per game
        avgFGA, // 14: Raw FGA for sorting (hidden)
        avgTPA, // 15: Raw TPA for sorting (hidden)
      ];
    });
}

type Effort = { date: string; effortDelta: number; matchId: string | number };
export function effortRows(
  effortList: Effort[] = []
): [string, string, string | number][] {
  return effortList.map((e) => [e.date, e.effortDelta.toFixed(2), e.matchId]);
}
