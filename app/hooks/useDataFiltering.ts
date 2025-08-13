/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import {
  INTERIOR_OFFENSES,
  NEUTRAL_OFFENSES,
  EXTERIOR_OFFENSES,
} from "@/app/utils/dataProcessing";

export function useDataFiltering(
  analysis: any,
  rawMatchData: any,
  selectedOffensiveStrategy: string,
  selectedDefensiveStrategy: string
) {
  // Check if match satisfies offensive strategy filter
  const matchesOffensiveFilter = (offStrategy: string) => {
    if (selectedOffensiveStrategy === "all") return true;
    if (selectedOffensiveStrategy === "interior")
      return INTERIOR_OFFENSES.includes(offStrategy);
    if (selectedOffensiveStrategy === "neutral")
      return NEUTRAL_OFFENSES.includes(offStrategy);
    if (selectedOffensiveStrategy === "exterior")
      return EXTERIOR_OFFENSES.includes(offStrategy);
    return offStrategy === selectedOffensiveStrategy;
  };

  // Check if match satisfies defensive strategy filter
  const matchesDefensiveFilter = (defStrategy: string) => {
    if (selectedDefensiveStrategy === "all") return true;
    return defStrategy === selectedDefensiveStrategy;
  };

  // Recalculate season statistics from filtered matches
  const recalculateSeasonStats = (matches: any[], originalSeasonData: any) => {
    if (matches.length === 0) {
      return {
        ...originalSeasonData,
        avgRatings: {},
        avgEfficiency: {},
        playerSumStats: {},
      };
    }

    // Recalculate average ratings
    const avgRatings: any = {};
    const ratingCounts: any = {};
    matches.forEach((match) => {
      Object.entries(match.ratings || {}).forEach(
        ([key, value]: [string, any]) => {
          if (!avgRatings[key]) avgRatings[key] = 0;
          if (!ratingCounts[key]) ratingCounts[key] = 0;
          avgRatings[key] += value;
          ratingCounts[key]++;
        }
      );
    });
    Object.keys(avgRatings).forEach((key) => {
      avgRatings[key] = avgRatings[key] / ratingCounts[key];
    });

    // Recalculate average efficiency
    const avgEfficiency: any = {};
    const efficiencyCounts: any = {};
    matches.forEach((match) => {
      Object.entries(match.efficiency || {}).forEach(
        ([key, value]: [string, any]) => {
          if (!avgEfficiency[key]) avgEfficiency[key] = 0;
          if (!efficiencyCounts[key]) efficiencyCounts[key] = 0;
          avgEfficiency[key] += value;
          efficiencyCounts[key]++;
        }
      );
    });
    Object.keys(avgEfficiency).forEach((key) => {
      avgEfficiency[key] = avgEfficiency[key] / efficiencyCounts[key];
    });

    // Recalculate player statistics
    const playerSumStats: any = {};
    matches.forEach((match) => {
      Object.entries(match.playerStats || {}).forEach(
        ([playerId, stats]: [string, any]) => {
          if (!playerSumStats[playerId]) {
            playerSumStats[playerId] = {
              name: stats.name,
              games: 0,
              pts: 0,
              ast: 0,
              reb: 0,
              blk: 0,
              stl: 0,
              to: 0,
              pf: 0,
              min: 0,
              fgm: 0,
              fga: 0,
              tpm: 0,
              tpa: 0,
            };
          }
          const player = playerSumStats[playerId];
          player.pts += stats.pts || 0;
          player.ast += stats.ast || 0;
          player.reb += stats.reb || 0;
          player.blk += stats.blk || 0;
          player.stl += stats.stl || 0;
          player.to += stats.to || 0;
          player.pf += stats.pf || 0;
          player.min += stats.min || 0;
          player.games += 1;
          player.fgm += stats.fgm || 0;
          player.fga += stats.fga || 0;
          player.tpm += stats.tpm || 0;
          player.tpa += stats.tpa || 0;
        }
      );
    });

    return {
      ...originalSeasonData,
      avgRatings,
      avgEfficiency,
      playerSumStats,
    };
  };

  const filteredAnalysis = useMemo(() => {
    if (
      !rawMatchData ||
      (!selectedOffensiveStrategy && !selectedDefensiveStrategy)
    ) {
      return analysis;
    }

    // Filter matches based on both offensive and defensive strategies (AND logic)
    const filteredData = { ...analysis };

    if (rawMatchData.seasonsData) {
      filteredData.seasonsData = rawMatchData.seasonsData.map(
        (seasonData: any) => {
          const filteredMatches =
            seasonData.matches?.filter(
              (match: any) =>
                matchesOffensiveFilter(match.offStrategy) &&
                matchesDefensiveFilter(match.defStrategy)
            ) || [];

          // Recalculate averages based on filtered matches
          return recalculateSeasonStats(filteredMatches, seasonData);
        }
      );
    }

    return filteredData;
  }, [
    analysis,
    rawMatchData,
    selectedOffensiveStrategy,
    selectedDefensiveStrategy,
  ]);

  return filteredAnalysis;
}
