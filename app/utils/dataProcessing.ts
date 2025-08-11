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
    .map((s: any) => [
      s.name,
      (s.pts / s.games).toFixed(1),
      (s.ast / s.games).toFixed(1),
      (s.reb / s.games).toFixed(1),
      (s.blk / s.games).toFixed(1),
      (s.stl / s.games).toFixed(1),
      (s.to / s.games).toFixed(1),
      (s.pf / s.games).toFixed(1),
      (s.min / s.games).toFixed(1),
      s.games,
    ]);
}

type Effort = { date: string; effortDelta: number; matchId: string | number };
export function effortRows(
  effortList: Effort[] = []
): [string, string, string | number][] {
  return effortList.map((e) => [e.date, e.effortDelta.toFixed(2), e.matchId]);
}
