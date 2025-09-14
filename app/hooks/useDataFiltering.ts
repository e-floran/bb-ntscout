/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useCallback } from "react";
import {
  INTERIOR_OFFENSES,
  NEUTRAL_OFFENSES,
  EXTERIOR_OFFENSES,
  normalizeStrategyName,
} from "@/app/utils/dataProcessing";

export function useDataFiltering(
  analysis: any,
  rawMatchData: any,
  selectedOffensiveStrategy: string,
  selectedDefensiveStrategy: string,
  excludeIrrelevantGames: boolean
) {
  // Helper function to check if a match uses the selected offensive strategy
  const matchesOffensiveFilter = useCallback(
    (offStrategy: string) => {
      if (selectedOffensiveStrategy === "all") return true;
      if (selectedOffensiveStrategy === "interior")
        return INTERIOR_OFFENSES.some((strat) =>
          normalizeStrategyName(offStrategy).includes(
            normalizeStrategyName(strat)
          )
        );
      if (selectedOffensiveStrategy === "neutral")
        return NEUTRAL_OFFENSES.some((strat) =>
          normalizeStrategyName(offStrategy).includes(
            normalizeStrategyName(strat)
          )
        );
      if (selectedOffensiveStrategy === "exterior")
        return EXTERIOR_OFFENSES.some((strat) =>
          normalizeStrategyName(offStrategy).includes(
            normalizeStrategyName(strat)
          )
        );
      return normalizeStrategyName(offStrategy).includes(
        normalizeStrategyName(selectedOffensiveStrategy)
      );
    },
    [selectedOffensiveStrategy]
  );

  // Helper function to check if a match is relevant
  const matchesRelevanceFilter = useCallback(
    (match: any) => {
      if (!excludeIrrelevantGames) return true;

      // Check if it's a scrimmage (friendly)
      if (match.type === "nt.friendly") {
        return false;
      }

      // Check if there are overtimes (more than 4 quarters)
      // The partials are in the format "24,22,29,26" for regular games
      if (match.partials && typeof match.partials === "string") {
        const quarters = match.partials.split(",");
        if (quarters.length > 4) {
          return false;
        }
      }

      return true;
    },
    [excludeIrrelevantGames]
  );

  // Helper function to check if a match uses the selected defensive strategy
  const matchesDefensiveFilter = useCallback(
    (defStrategy: string) => {
      if (selectedDefensiveStrategy === "all") return true;
      // For defensive strategies, we can also normalize if needed in the future
      return normalizeStrategyName(defStrategy).includes(
        normalizeStrategyName(selectedDefensiveStrategy)
      );
    },
    [selectedDefensiveStrategy]
  );

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

    // Recalculate average and max ratings
    const avgRatings: any = {};
    const ratingCounts: any = {};
    const maxRatings: any = {};
    matches.forEach((match) => {
      Object.entries(match.ratings || {}).forEach(
        ([key, value]: [string, any]) => {
          if (!avgRatings[key]) avgRatings[key] = 0;
          if (!ratingCounts[key]) ratingCounts[key] = 0;
          avgRatings[key] += value;
          ratingCounts[key]++;
          if (maxRatings[key] === undefined || value > maxRatings[key]) {
            maxRatings[key] = value;
          }
        }
      );
    });
    Object.keys(avgRatings).forEach((key) => {
      avgRatings[key] = avgRatings[key] / ratingCounts[key];
      avgRatings[key + "_max"] =
        maxRatings[key] !== undefined ? maxRatings[key] : avgRatings[key];
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
          // Filter matches based on strategies and relevance
          const filteredMatches =
            seasonData.matches?.filter((match: any) => {
              const offensiveMatch = matchesOffensiveFilter(match);
              const defensiveMatch = matchesDefensiveFilter(match);
              const relevanceMatch = matchesRelevanceFilter(match);
              return offensiveMatch && defensiveMatch && relevanceMatch;
            }) || [];

          // Recalculate averages based on filtered matches
          const recalculatedSeasonData = recalculateSeasonStats(
            filteredMatches,
            seasonData
          );

          // Filter recent games to match the same criteria
          const filteredRecentGames =
            seasonData.recentGames?.filter((game: any) => {
              // Find corresponding match data to get type and partials
              const matchData = seasonData.matches?.find(
                (match: any) => match.matchId === game.matchId
              );
              if (matchData) {
                const offensiveMatch = matchesOffensiveFilter(
                  matchData.offStrategy
                );
                const defensiveMatch = matchesDefensiveFilter(
                  matchData.defStrategy
                );
                const relevanceMatch = matchesRelevanceFilter(matchData);
                return offensiveMatch && defensiveMatch && relevanceMatch;
              }
              // If no match data found, include by default (shouldn't happen)
              return true;
            }) || [];

          return {
            ...seasonData,
            // Replace with filtered data
            matches: filteredMatches,
            recentGames: filteredRecentGames,
            // Update aggregated data based on filtered matches
            avgRatings: recalculatedSeasonData.avgRatings,
            avgEfficiency: recalculatedSeasonData.avgEfficiency,
            playerSumStats: recalculatedSeasonData.playerSumStats,
          };
        }
      );
    }

    return filteredData;
  }, [
    analysis,
    rawMatchData,
    selectedOffensiveStrategy,
    selectedDefensiveStrategy,
    matchesOffensiveFilter,
    matchesDefensiveFilter,
    matchesRelevanceFilter,
  ]);

  return filteredAnalysis;
}
