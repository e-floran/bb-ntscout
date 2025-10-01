"use client";

import React from "react";

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ rows = 5, cols = 4 }: SkeletonTableProps) {
  return (
    <div style={{ margin: "1rem 0" }}>
      <div
        style={{
          height: "20px",
          backgroundColor: "#e9ecef",
          borderRadius: "4px",
          marginBottom: "1rem",
          width: "60%",
          animation: "skeleton-loading 1.5s ease-in-out infinite",
        }}
      />
      <table className="table-analysis" style={{ opacity: 0.7 }}>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <div
                  style={{
                    height: "16px",
                    backgroundColor: "#e9ecef",
                    borderRadius: "3px",
                    animation: "skeleton-loading 1.5s ease-in-out infinite",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex}>
                  <div
                    style={{
                      height: "14px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "3px",
                      animation: "skeleton-loading 1.5s ease-in-out infinite",
                      animationDelay: `${(rowIndex * cols + colIndex) * 0.05}s`,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <style jsx>{`
        @keyframes skeleton-loading {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
