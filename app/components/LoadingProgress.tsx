"use client";

import React from "react";
import { LinearProgress } from "@mui/material";

interface LoadingStep {
  step: string;
  completed: boolean;
  current: boolean;
}

interface LoadingProgressProps {
  loadingSteps: LoadingStep[];
}

export function LoadingProgress({ loadingSteps }: LoadingProgressProps) {
  return (
    <div
      style={{
        margin: "2rem 0",
        padding: "1.5rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "1px solid #e9ecef",
      }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <h3
          style={{ margin: "0 0 1rem 0", color: "#495057", fontSize: "1.1rem" }}
        >
          Analyse en cours...
        </h3>
        <LinearProgress
          variant="determinate"
          value={
            (loadingSteps.filter((s) => s.completed).length /
              loadingSteps.length) *
            100
          }
          style={{
            height: "8px",
            borderRadius: "4px",
            backgroundColor: "#e9ecef",
          }}
          sx={{
            "& .MuiLinearProgress-bar": {
              backgroundColor: "#28a745",
            },
          }}
        />
        <div
          style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#6c757d" }}
        >
          {Math.round(
            (loadingSteps.filter((s) => s.completed).length /
              loadingSteps.length) *
              100
          )}
          % terminé
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {loadingSteps.map((step, index) => (
          <div
            key={index}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: step.completed
                  ? "#28a745"
                  : step.current
                  ? "#007bff"
                  : "#dee2e6",
                border: step.current ? "2px solid #007bff" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
              }}
            >
              {step.completed && (
                <span
                  style={{
                    color: "white",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                >
                  ✓
                </span>
              )}
              {step.current && !step.completed && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: "#007bff",
                    borderRadius: "50%",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              )}
            </div>
            <span
              style={{
                color: step.completed
                  ? "#28a745"
                  : step.current
                  ? "#007bff"
                  : "#6c757d",
                fontWeight: step.current ? "600" : "normal",
                fontSize: "0.95rem",
              }}
            >
              {step.step}
            </span>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
