"use client";

import React from "react";

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
}

export function DataTable({
  headers,
  rows,
  tableId,
  sortConfig,
  onSort,
}: DataTableProps) {
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
    if (!sortConfig || sortConfig.table !== tableId) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      let aVal = a[sortConfig.column];
      let bVal = b[sortConfig.column];

      // Special handling for player stats table shooting columns
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
              {h}
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
          <tr key={i}>
            {row.slice(0, headers.length).map(
              (
                val,
                j // Only show the visible columns
              ) => (
                <td
                  key={j}
                  className={isNumeric(val, j) ? getLevelClass(val) : ""}
                >
                  {val}
                </td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
