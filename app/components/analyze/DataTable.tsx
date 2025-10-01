"use client";

import React, { useState, useEffect } from "react";

interface SortConfig {
  table: string;
  column: number;
  direction: "asc" | "desc";
}

interface DataTableProps {
  headers: string[];
  rows: (string | number)[][];
  tableId: string;
  sortConfig: SortConfig | null;
  onSort: (tableId: string, columnIndex: number) => void;
  rowClassName?: (rowIndex: number) => string;
}

// Mobile abbreviations mappings
const MOBILE_ABBREVIATIONS = {
  // Headers
  Stratégies: "Strat",
  Catégorie: "Cat",
  Position: "Pos",

  // Season header variations
  "Saison 69": "S69",
  "Saison 68": "S68",
  "Saison 67": "S67",
  "Saison 66": "S66",
  "Saison 65": "S65",
  "Saison 64": "S64",
  "Saison 63": "S63",
  "Saison 62": "S62",
  "Saison 61": "S61",
  "Saison 60": "S60",

  // Offensive strategies (all from StrategyFilters.tsx)
  "Toutes les attaques": "Toutes",
  "Look Inside": "LI",
  "Low Post": "PB",
  "Attaques intérieures": "AI",
  Base: "BO",
  Push: "PTB",
  Patient: "Pat",
  "Outside Isolation": "IE",
  "Inside Isolation": "II",
  "Attaques neutres": "AN",
  Motion: "Mot",
  "Run And Gun": "RnG",
  Princeton: "Pri",
  "Attaques extérieures": "AE",

  // Additional potential offensive strategy variations
  interior: "AI",
  neutral: "AN",
  exterior: "AE",

  // Defensive strategies (all from StrategyFilters.tsx)
  "Toutes les défenses": "Toutes",
  "32 Zone": "32",
  "Outside Box And One": "BE",
  "23 Zone": "23",
  "Inside Box And One": "BI",
  "Man To Man": "HH",
  "131 Zone": "131",

  // Team ratings categories
  "Outside Scoring": "AE",
  "Inside Scoring": "AI",
  "Outside Defense": "DE",
  "Inside Defense": "DI",
  Rebounding: "RE",
  "Offensive Flow": "GA",
};

export function DataTable({
  headers,
  rows,
  tableId,
  sortConfig,
  onSort,
  rowClassName,
}: DataTableProps) {
  // Mobile detection hook
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Helper function to get abbreviated text for mobile
  const getDisplayText = (text: string | number): string | number => {
    if (!isMobile || typeof text !== "string") return text;

    // Try exact match first
    const exactMatch =
      MOBILE_ABBREVIATIONS[text as keyof typeof MOBILE_ABBREVIATIONS];
    if (exactMatch) return exactMatch;

    // Normalize spaces and try matching (handles multiple spaces between words)
    const normalizedText = text.trim().replace(/\s+/g, " ");
    const matchingKey = Object.keys(MOBILE_ABBREVIATIONS).find(
      (key) => key.toLowerCase() === normalizedText.toLowerCase()
    );

    if (matchingKey) {
      return MOBILE_ABBREVIATIONS[
        matchingKey as keyof typeof MOBILE_ABBREVIATIONS
      ];
    }

    return text;
  };

  // Helper function to get the appropriate level class based on numeric value
  const getLevelClass = (value: string | number): string => {
    if (tableId !== "avg-ratings") return "";

    const numValue = parseFloat(String(value));
    if (isNaN(numValue)) return "";

    // Apply level classes based on the ranges specified
    // lev1: 0.00-1.99, lev2: 2.00-2.99, ..., lev20: 20.00+
    if (numValue >= 20.0) return "lev20";
    if (numValue >= 19.0) return "lev19";
    if (numValue >= 18.0) return "lev18";
    if (numValue >= 17.0) return "lev17";
    if (numValue >= 16.0) return "lev16";
    if (numValue >= 15.0) return "lev15";
    if (numValue >= 14.0) return "lev14";
    if (numValue >= 13.0) return "lev13";
    if (numValue >= 12.0) return "lev12";
    if (numValue >= 11.0) return "lev11";
    if (numValue >= 10.0) return "lev10";
    if (numValue >= 9.0) return "lev9";
    if (numValue >= 8.0) return "lev8";
    if (numValue >= 7.0) return "lev7";
    if (numValue >= 6.0) return "lev6";
    if (numValue >= 5.0) return "lev5";
    if (numValue >= 4.0) return "lev4";
    if (numValue >= 3.0) return "lev3";
    if (numValue >= 2.0) return "lev2";
    return "lev1"; // 0.00-1.99
  };

  // Helper function to check if a value is numeric (for avg-ratings table)
  const isNumeric = (value: string | number, columnIndex: number): boolean => {
    if (tableId !== "avg-ratings" || columnIndex === 0) return false; // First column is category names
    const numValue = parseFloat(String(value));
    return !isNaN(numValue) && String(value).trim() !== "";
  };

  // Generic sort function for table rows
  const sortRows = (rows: (string | number)[][]): (string | number)[][] => {
    if (sortConfig?.table !== tableId) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      let aVal = a[sortConfig.column];
      let bVal = b[sortConfig.column];

      if (tableId === "player-stats") {
        if (sortConfig.column === 4) {
          // FG M-A column
          aVal = a[14]; // Use hidden raw FGA value
          bVal = b[14];
        } else if (sortConfig.column === 6) {
          // 3P M-A column
          aVal = a[15]; // Use hidden raw TPA value
          bVal = b[15];
        }
      }

      if (tableId === "gdp") {
        const aDate = new Date(String(aVal)).getTime();
        const bDate = new Date(String(bVal)).getTime();
        const comp = aDate - bDate;
        return sortConfig.direction === "asc" ? comp : -comp;
      }

      // Handle numeric values
      const aNum = parseFloat(String(aVal));
      const bNum = parseFloat(String(bVal));

      let comparison = 0;

      if (!isNaN(aNum) && !isNaN(bNum)) {
        // Both are numbers
        comparison = aNum - bNum;
      } else {
        // String comparison
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  };

  const sortedRows = sortRows(rows);

  return (
    <div className="table-container">
      <table className="table-analysis">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                onClick={() => onSort(tableId, i)}
                style={{
                  cursor: "pointer",
                  userSelect: "none",
                  backgroundColor:
                    sortConfig?.table === tableId && sortConfig?.column === i
                      ? "#f0f0f0"
                      : "#3c5489",
                }}
              >
                {getDisplayText(h)}
                {sortConfig?.table === tableId && sortConfig?.column === i && (
                  <span style={{ marginLeft: "4px" }}>
                    {sortConfig.direction === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr key={i} className={rowClassName ? rowClassName(i) : ""}>
              {row.slice(0, headers.length).map((val, j) => (
                <td
                  key={j}
                  className={isNumeric(val, j) ? getLevelClass(val) : ""}
                >
                  {getDisplayText(val)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
