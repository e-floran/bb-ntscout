"use client";

import React, { useState } from "react";
import { PlayerWithHistory } from "@/app/types/playerHistory";

interface PlayerHistoryCardProps {
  player: PlayerWithHistory;
  children?: React.ReactNode;
}

export function PlayerHistoryCard({
  player,
  children,
}: PlayerHistoryCardProps) {
  const [showHistory, setShowHistory] = useState(false);

  const getChangeColor = (change: number) => {
    if (change > 0) return "#22c55e";
    if (change < 0) return "#ef4444";
    return "#6b7280";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return "↑";
    if (change < 0) return "↓";
    return "→";
  };

  const getDMIComparisonColor = (percentage: number) => {
    if (percentage >= 95) return "#22c55e"; // Green for 95%+
    if (percentage >= 85) return "#f59e0b"; // Amber for 85-94%
    if (percentage >= 70) return "#f97316"; // Orange for 70-84%
    return "#ef4444"; // Red for below 70%
  };

  const hasHistory =
    player.gameShapeHistory && player.gameShapeHistory.length > 0;
  const hasCurrentData = player.isCurrentWeekDataAvailable === true;
  const mostRecentData = hasHistory ? player.gameShapeHistory![0] : null;

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "12px",
        backgroundColor: "white",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Render existing player content */}
      {children}

      {/* Always show the data section */}
      <div
        style={{
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: "1px solid #f3f4f6",
          backgroundColor: "#fafbfc",
          padding: "8px 12px",
          borderRadius: "4px",
          fontSize: "13px",
        }}
      >
        {hasCurrentData ? (
          <>
            <div
              style={{
                display: "flex",
                gap: "20px",
                marginBottom: "8px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontWeight: "500",
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                GS: {player.currentGameShape}
                {player.gameShapeChange !== 0 && (
                  <span
                    style={{
                      color: getChangeColor(player.gameShapeChange || 0),
                      marginLeft: "4px",
                      fontSize: "12px",
                    }}
                  >
                    {getChangeIcon(player.gameShapeChange || 0)}
                    {Math.abs(player.gameShapeChange || 0)}
                  </span>
                )}
              </span>
              <span
                style={{
                  fontWeight: "500",
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                DMI: {(player.currentDMI! / 1000).toFixed(0)}k
                {player.dmiChange !== 0 && (
                  <span
                    style={{
                      color: getChangeColor(player.dmiChange || 0),
                      marginLeft: "4px",
                      fontSize: "12px",
                    }}
                  >
                    {getChangeIcon(player.dmiChange || 0)}
                    {Math.abs(Math.round((player.dmiChange || 0) / 1000))}k
                  </span>
                )}
              </span>
            </div>

            {/* DMI Comparison to last GS=9 */}
            <div
              style={{
                marginBottom: "8px",
                padding: "6px 8px",
                backgroundColor: "white",
                borderRadius: "4px",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  fontWeight: "500",
                }}
              >
                % du dernier compétent:
              </span>
              {player.dmiComparisonToLastGS9 ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: getDMIComparisonColor(
                        player.dmiComparisonToLastGS9.percentage
                      ),
                    }}
                  >
                    {player.dmiComparisonToLastGS9.percentage.toFixed(1)}%
                  </span>
                  {player.currentGameShape !== 9 && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#9ca3af",
                        fontStyle: "italic",
                      }}
                    >
                      (S{player.dmiComparisonToLastGS9.lastGS9WeekId}:{" "}
                      {Math.round(
                        player.dmiComparisonToLastGS9.lastGS9DMI / 1000
                      )}
                      k)
                    </span>
                  )}
                </div>
              ) : (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    fontStyle: "italic",
                  }}
                >
                  Pas de comparaison
                </span>
              )}
            </div>
          </>
        ) : (
          /* Show message when current week data is not available */
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px 8px",
                backgroundColor: "#fef3c7",
                borderRadius: "4px",
                border: "1px solid #f59e0b",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    color: "#f59e0b",
                  }}
                >
                  ⏳
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "#92400e",
                    fontWeight: "500",
                    textAlign: "center",
                  }}
                >
                  Données de la semaine courante pas encore disponibles
                </span>
              </div>
            </div>

            {/* Show most recent data with clear indication it's old */}
            {mostRecentData && (
              <div
                style={{
                  padding: "8px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "4px",
                  border: "1px solid #e5e7eb",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#6b7280",
                    fontWeight: "500",
                    marginBottom: "4px",
                  }}
                >
                  Dernières données disponibles (S{mostRecentData.weekId}):
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    fontSize: "12px",
                    color: "#4b5563",
                  }}
                >
                  <span>GS: {mostRecentData.gameShape}</span>
                  <span>DMI: {(mostRecentData.dmi / 1000).toFixed(0)}k</span>
                </div>
              </div>
            )}
          </>
        )}

        {hasHistory && player.gameShapeHistory!.length > 1 && (
          <>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                fontSize: "11px",
                cursor: "pointer",
                padding: "2px 0",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {showHistory ? "▼" : "▶"} Historique (
              {player.gameShapeHistory!.length} semaines)
            </button>

            {showHistory && (
              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(75px, 1fr))",
                    gap: "6px",
                    marginBottom: "8px",
                  }}
                >
                  {player.gameShapeHistory!.slice(0, 10).map((week) => (
                    <div
                      key={`${player.id}-${week.weekId}`}
                      style={{
                        textAlign: "center",
                        padding: "6px 4px",
                        backgroundColor:
                          week.gameShape === 9 ? "#f0fdf4" : "white",
                        borderRadius: "3px",
                        border:
                          week.gameShape === 9
                            ? "1px solid #22c55e"
                            : "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: "600",
                          color: "#6b7280",
                          marginBottom: "3px",
                        }}
                      >
                        S{week.weekId}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "1px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "9px",
                            color: "#374151",
                            fontWeight: week.gameShape === 9 ? "600" : "normal",
                          }}
                        >
                          GS: {week.gameShape}
                        </span>
                        <span style={{ fontSize: "9px", color: "#374151" }}>
                          DMI: {Math.round(week.dmi / 1000)}k
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {player.gameShapeHistory!.length > 10 && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#9ca3af",
                      textAlign: "center",
                      fontStyle: "italic",
                    }}
                  >
                    Showing last 10 weeks of {player.gameShapeHistory!.length}{" "}
                    total
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
