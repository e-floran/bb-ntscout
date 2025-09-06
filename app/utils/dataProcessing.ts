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

// Utility to normalize strategy names for comparison (removes spaces, consistent casing)
export function normalizeStrategyName(str: string): string {
  if (!str) return "";
  return str.replace(/\s+/g, "").toLowerCase();
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
        .filter((key) => !key.endsWith("_max"))
    )
  );
  return allCats.map((cat) => {
    // For each season, get average and max for this category
    const values = avgs.map((obj) => obj?.[cat]).filter((v) => v !== undefined);
    return [
      humanize(cat),
      ...avgs.flatMap((obj) => {
        const avg = obj?.[cat] !== undefined ? obj[cat].toFixed(2) : "";
        // Find max for this category in this season (if array of games is available)
        // If obj[cat + "_max"] exists, use it, else fallback to avg
        const max =
          obj?.[cat + "_max"] !== undefined
            ? obj[cat + "_max"].toFixed(2)
            : avg;
        return [avg, max];
      }),
    ];
  });
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

type Effort = {
  date: string;
  effortDelta: number;
  matchId: string | number;
  opponent?: string;
};
export function effortRows(
  effortList: Effort[] = []
): [string, string, string | number, string][] {
  return effortList.map((e) => {
    // Format date from ISO to DD-MM-YYYY
    let formattedDate = e.date;
    if (typeof formattedDate === "string" && formattedDate.includes("T")) {
      const d = new Date(formattedDate);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      formattedDate = `${day}-${month}-${year}`;
    }
    return [
      formattedDate,
      e.effortDelta.toFixed(2),
      e.matchId,
      e.opponent || "",
    ];
  });
}

type GdpEntry = {
  date: string;
  opponent?: string;
  gdp: string;
};
export function gdpRows(
  gdpList: GdpEntry[] = []
): [string, string | string, string][] {
  return gdpList.map((g) => {
    // Format date from ISO to DD-MM-YYYY
    let formattedDate = g.date;
    if (typeof formattedDate === "string" && formattedDate.includes("T")) {
      const d = new Date(formattedDate);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      formattedDate = `${day}-${month}-${year}`;
    }

    let gdpValue = g.gdp ?? "";
    if (gdpValue === "N/A N/A") {
      gdpValue = "N/A";
    } else {
      gdpValue = gdpValue
        .replace(/\.hit\b/g, " ✅")
        .replace(/\.miss\b/g, " ❌");

      gdpValue = gdpValue.replace(/([✅❌])\s*\/\s*/g, "$1 / ");

      gdpValue = gdpValue.replace(/([✅❌])(?=[^\s/])/g, "$1 / ");

      gdpValue = gdpValue.replace(/([✅❌])\s+(?=[^\s/])/g, "$1 / ");

      gdpValue = gdpValue.replace(/\s{2,}/g, " ").trim();
    }

    return [formattedDate, g.opponent || "", gdpValue];
  });
}

export function multiSeasonPlayerRows(seasonsData: any[] = []) {
  // Aggregate stats across all seasons
  const aggregatedStats: Record<string, any> = {};

  // Process each season's player stats
  seasonsData.forEach((seasonData) => {
    const playerStats = seasonData?.playerSumStats || {};

    Object.entries(playerStats).forEach(([playerId, stats]: [string, any]) => {
      if (!aggregatedStats[playerId]) {
        aggregatedStats[playerId] = {
          name: stats.name,
          pts: 0,
          ast: 0,
          reb: 0,
          min: 0,
          games: 0,
          blk: 0,
          stl: 0,
          to: 0,
          pf: 0,
          fgm: 0,
          fga: 0,
          tpm: 0,
          tpa: 0,
        };
      }

      // Sum up all stats across seasons
      aggregatedStats[playerId].pts += stats.pts || 0;
      aggregatedStats[playerId].ast += stats.ast || 0;
      aggregatedStats[playerId].reb += stats.reb || 0;
      aggregatedStats[playerId].min += stats.min || 0;
      aggregatedStats[playerId].games += stats.games || 0;
      aggregatedStats[playerId].blk += stats.blk || 0;
      aggregatedStats[playerId].stl += stats.stl || 0;
      aggregatedStats[playerId].to += stats.to || 0;
      aggregatedStats[playerId].pf += stats.pf || 0;
      aggregatedStats[playerId].fgm += stats.fgm || 0;
      aggregatedStats[playerId].fga += stats.fga || 0;
      aggregatedStats[playerId].tpm += stats.tpm || 0;
      aggregatedStats[playerId].tpa += stats.tpa || 0;
    });
  });

  // Now use the existing playerRows logic with aggregated data
  return Object.values(aggregatedStats)
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
