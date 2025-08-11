"use client";

import React from "react";

const OFFENSIVE_STRATEGIES = {
  all: "Toutes les attaques",
  "Look Inside": "Look Inside",
  "Low Post": "Low Post",
  interior: "Attaques intérieures",
  Base: "Base",
  Push: "Push",
  Patient: "Patient",
  "Outside Isolation": "Outside Isolation",
  "Inside Isolation": "Inside Isolation",
  neutral: "Attaques neutres",
  Motion: "Motion",
  "Run And Gun": "Run And Gun",
  Princeton: "Princeton",
  exterior: "Attaques extérieures",
};

const DEFENSIVE_STRATEGIES = {
  all: "Toutes les défenses",
  "32 Zone": "32 Zone",
  "Outside Box And One": "Outside Box And One",
  "23 Zone": "23 Zone",
  "Inside Box And One": "Inside Box And One",
  "Man To Man": "Man To Man",
  "131 Zone": "131 Zone",
};

interface StrategyFiltersProps {
  selectedOffensiveStrategy: string;
  selectedDefensiveStrategy: string;
  onOffensiveStrategyChange: (strategy: string) => void;
  onDefensiveStrategyChange: (strategy: string) => void;
}

export function StrategyFilters({
  selectedOffensiveStrategy,
  selectedDefensiveStrategy,
  onOffensiveStrategyChange,
  onDefensiveStrategyChange,
}: StrategyFiltersProps) {
  const hasActiveFilters =
    selectedOffensiveStrategy !== "all" || selectedDefensiveStrategy !== "all";

  return (
    <div
      className="analysis-section"
      style={{
        backgroundColor: "#f8f9fa",
        padding: "1.5rem",
        borderRadius: "8px",
        border: "1px solid #e9ecef",
        marginBottom: "2rem",
      }}
    >
      <div
        className="analysis-title"
        style={{ marginBottom: "1rem", borderBottom: "none" }}
      >
        Filtres par stratégies
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "600",
              color: "#495057",
            }}
          >
            Stratégie offensive :
          </label>
          <select
            value={selectedOffensiveStrategy}
            onChange={(e) => onOffensiveStrategyChange(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ced4da",
              borderRadius: "4px",
              backgroundColor: "white",
              fontSize: "0.9rem",
            }}
          >
            {Object.entries(OFFENSIVE_STRATEGIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "600",
              color: "#495057",
            }}
          >
            Stratégie défensive :
          </label>
          <select
            value={selectedDefensiveStrategy}
            onChange={(e) => onDefensiveStrategyChange(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ced4da",
              borderRadius: "4px",
              backgroundColor: "white",
              fontSize: "0.9rem",
            }}
          >
            {Object.entries(DEFENSIVE_STRATEGIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {hasActiveFilters && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: "4px",
            fontSize: "0.9rem",
            color: "#155724",
          }}
        >
          Filtres actifs - Les données ci-dessous sont filtrées selon les
          stratégies sélectionnées
        </div>
      )}
    </div>
  );
}
