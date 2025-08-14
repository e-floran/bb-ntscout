"use client";

import React, { useState } from "react";
import { PlayerWithHistory } from "@/app/types/playerHistory";

interface RecentGame {
  matchId: string;
  date: string;
  opponent: {
    id: string;
    name: string;
  } | null;
  strategies: {
    offense: string;
    defense: string;
  };
  playerMinutes: Record<
    string,
    {
      name: string;
      positionMinutes: Record<"PG" | "SG" | "SF" | "PF" | "C", number>;
      totalMinutes: number;
    }
  >;
}

interface RecentGamesCardProps {
  game: RecentGame;
  playersWithHistory: PlayerWithHistory[];
}

export function RecentGamesCard({
  game,
  playersWithHistory,
}: RecentGamesCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Create a lookup map for gameshape data
  const gameshapeMap = new Map<string, PlayerWithHistory>();
  playersWithHistory.forEach((player) => {
    gameshapeMap.set(player.id, player);
  });

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Get gameshape for a player at the time of the game
  const getGameshapeAtDate = (
    playerId: string,
    gameDate: string
  ): number | null => {
    const player = gameshapeMap.get(playerId);
    if (!player || !player.gameShapeHistory) return null;

    const gameDateTime = new Date(gameDate);

    // Find the gameshape entry closest to but not after the game date
    const validEntries = player.gameShapeHistory
      .filter((entry) => new Date(entry.date) <= gameDateTime)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return validEntries.length > 0 ? validEntries[0].gameShape : null;
  };

  // Get gameshape color
  const getGameshapeColor = (gs: number | null) => {
    if (gs === null) return "#6b7280";
    if (gs >= 9) return "#22c55e";
    if (gs >= 7) return "#f59e0b";
    if (gs >= 5) return "#f97316";
    return "#ef4444";
  };

  // Sort players by total minutes (highest first)
  const sortedPlayers = Object.entries(game.playerMinutes).sort(
    ([, a], [, b]) => b.totalMinutes - a.totalMinutes
  );

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        backgroundColor: "white",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Game Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          cursor: "pointer",
        }}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div>
          <div
            style={{ fontWeight: "600", fontSize: "16px", marginBottom: "4px" }}
          >
            vs {game.opponent?.name || "Adversaire inconnu"}
          </div>
          <div style={{ fontSize: "14px", color: "#6b7280" }}>
            {formatDate(game.date)} • Match ID: {game.matchId}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}
          >
            Off: {game.strategies.offense}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Def: {game.strategies.defense}
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div
          style={{
            borderTop: "1px solid #f3f4f6",
            paddingTop: "12px",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              Minutes par joueur et poste:
            </h4>
            <div style={{ display: "grid", gap: "8px" }}>
              {sortedPlayers.map(([playerId, playerData]) => {
                const gameshape = getGameshapeAtDate(playerId, game.date);
                return (
                  <div
                    key={playerId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 12px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ flex: "1", fontWeight: "500" }}>
                      {playerData.name}
                      {gameshape !== null && (
                        <span
                          style={{
                            marginLeft: "8px",
                            padding: "2px 6px",
                            borderRadius: "12px",
                            backgroundColor: getGameshapeColor(gameshape),
                            color: "white",
                            fontSize: "11px",
                            fontWeight: "600",
                          }}
                        >
                          GS{gameshape}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      {["PG", "SG", "SF", "PF", "C"].map((pos) => (
                        <div
                          key={pos}
                          style={{ textAlign: "center", minWidth: "30px" }}
                        >
                          <div style={{ fontSize: "10px", color: "#6b7280" }}>
                            {pos}
                          </div>
                          <div style={{ fontWeight: "500" }}>
                            {playerData.positionMinutes[
                              pos as keyof typeof playerData.positionMinutes
                            ] || 0}
                          </div>
                        </div>
                      ))}
                      <div
                        style={{
                          marginLeft: "8px",
                          padding: "2px 6px",
                          backgroundColor: "#e5e7eb",
                          borderRadius: "4px",
                          fontWeight: "600",
                          fontSize: "12px",
                        }}
                      >
                        {playerData.totalMinutes}min
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{ fontSize: "11px", color: "#6b7280", textAlign: "center" }}
          >
            Cliquez pour masquer les détails
          </div>
        </div>
      )}

      {!showDetails && (
        <div
          style={{ fontSize: "11px", color: "#6b7280", textAlign: "center" }}
        >
          Cliquez pour voir les minutes par poste et formes
        </div>
      )}
    </div>
  );
}
