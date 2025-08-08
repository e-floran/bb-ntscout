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

  const hasHistory =
    player.gameShapeHistory && player.gameShapeHistory.length > 0;
  const hasCurrentData =
    player.currentGameShape !== undefined && player.currentDMI !== undefined;

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

      {/* Add history section if data exists */}
      {hasCurrentData && (
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
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginBottom: "8px",
              alignItems: "center",
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
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(75px, 1fr))",
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
                          backgroundColor: "white",
                          borderRadius: "3px",
                          border: "1px solid #e5e7eb",
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
                          <span style={{ fontSize: "9px", color: "#374151" }}>
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
      )}
    </div>
  );
}
