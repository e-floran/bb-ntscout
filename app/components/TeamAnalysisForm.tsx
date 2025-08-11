"use client";

import React from "react";

interface TeamAnalysisFormProps {
  teamId: string;
  numSeasons: number;
  loading: boolean;
  onTeamIdChange: (value: string) => void;
  onNumSeasonsChange: (value: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function TeamAnalysisForm({
  teamId,
  numSeasons,
  loading,
  onTeamIdChange,
  onNumSeasonsChange,
  onSubmit,
}: TeamAnalysisFormProps) {
  return (
    <form className="analysis-form" onSubmit={onSubmit}>
      <label className="analysis-form-label">
        Team Id&nbsp;
        <input
          className="analysis-form-input"
          type="text"
          value={teamId}
          onChange={(e) => onTeamIdChange(e.target.value)}
          required
          placeholder="ID"
          disabled={loading}
        />
      </label>
      <label className="analysis-form-label">
        Nombre de saisons&nbsp;
        <input
          className="analysis-form-input"
          type="number"
          value={numSeasons}
          min={1}
          max={10}
          onChange={(e) => onNumSeasonsChange(Number(e.target.value))}
          required
          disabled={loading}
        />
      </label>
      <button
        type="submit"
        className="analysis-form-submit"
        disabled={loading}
        style={{ opacity: loading ? 0.6 : 1 }}
      >
        {loading ? "Analyse..." : "Analyser"}
      </button>
    </form>
  );
}
