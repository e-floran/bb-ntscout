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
  // Generic sort function for table rows
  const sortRows = (rows: (string | number)[][]): (string | number)[][] => {
    if (!sortConfig || sortConfig.table !== tableId) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.column];
      const bVal = b[sortConfig.column];

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
            {row.map((val, j) => (
              <td key={j}>{val}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
