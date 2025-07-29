/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import IconButton from "@mui/material/IconButton";
import LogoutIcon from "@mui/icons-material/Logout";
import { useRouter } from "next/navigation";
import styles from "./page.module.css"; // Assuming you use this for styling

// Utility to humanize camelCase/PascalCase for display
function humanize(str: string) {
  if (!str) return "";
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

type AnalysisResult = any;

export default function IndexPage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  // New: form state
  const [teamId, setTeamId] = useState("");
  const [numSeasons, setNumSeasons] = useState<number>(2);

  const router = useRouter();

  // Logout handler
  async function handleLogout() {
    try {
      const res = await fetch("/api/logout", { method: "POST" });
      if (res.ok) {
        router.replace("/login");
      } else {
        alert("Déconnexion échouée.");
      }
    } catch (e) {
      alert("Erreur lors de la déconnexion.");
    }
  }

  // Load main data on mount
  useEffect(() => {
    setLoading(true);
    setErr("");
    setAnalysis(null);
    fetch("/api/analyzeTeam")
      .then(async (res) => {
        const data = await res.json();
        if (data.error) setErr(data.error);
        else setAnalysis(data);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Form handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setAnalysis(null);
    setLoading(true);

    // Validate
    if (!teamId.trim() || !numSeasons) {
      setErr("Veuillez remplir les deux champs.");
      setLoading(false);
      return;
    }
    if (numSeasons < 1 || numSeasons > 10) {
      setErr("Le nombre de saisons doit être entre 1 et 10.");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({
      teamId: teamId.trim(),
      numberOfSeasons: String(numSeasons),
    }).toString();

    const res = await fetch(`/api/analyzeTeam?${params}`);
    const data = await res.json();
    if (data.error) setErr(data.error);
    else setAnalysis(data);
    setLoading(false);
  }

  function renderTable(headers: string[], rows: (string | number)[][]) {
    return (
      <table className="table-analysis">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
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

  const seasonLabels =
    analysis && analysis.seasons
      ? analysis.seasons
      : analysis && analysis.season && analysis.prevSeason
      ? [analysis.season, analysis.prevSeason]
      : [];

  function stratRows(
    strats: Record<string, number>[] = []
  ): [string, ...(number | "")[]][] {
    // Get all unique strategy names from all seasons
    const allKeys = Array.from(
      new Set(
        strats
          .map((obj) => Object.keys(obj || {}))
          .reduce((a, b) => a.concat(b), [])
      )
    );
    return allKeys.map((strat) => [
      humanize(strat),
      ...strats.map((obj) => obj?.[strat] ?? ""),
    ]);
  }

  function avgRows(
    avgs: Record<string, number>[] = []
  ): [string, ...(string | "")[]][] {
    const allCats = Array.from(
      new Set(
        avgs
          .map((obj) => Object.keys(obj || {}))
          .reduce((a, b) => a.concat(b), [])
      )
    );
    return allCats.map((cat) => [
      humanize(cat),
      ...avgs.map((obj) =>
        obj?.[cat] !== undefined ? obj[cat].toFixed(2) : ""
      ),
    ]);
  }

  type Position = "PG" | "SG" | "SF" | "PF" | "C";
  function effRows(
    effs: Partial<Record<Position, number>>[] = []
  ): [string, ...(string | "")[]][] {
    return (["PG", "SG", "SF", "PF", "C"] as Position[]).map((pos) => [
      pos,
      ...effs.map((eff) =>
        eff?.[pos] !== undefined ? eff[pos]!.toFixed(1) : ""
      ),
    ]);
  }

  function playerRows(stats = {}) {
    return Object.values(stats)
      .filter((s: any) => s.games > 0)
      .map((s: any) => [
        s.name,
        (s.pts / s.games).toFixed(1),
        (s.ast / s.games).toFixed(1),
        (s.reb / s.games).toFixed(1),
        (s.blk / s.games).toFixed(1),
        (s.stl / s.games).toFixed(1),
        (s.to / s.games).toFixed(1),
        (s.pf / s.games).toFixed(1),
        (s.min / s.games).toFixed(1),
        s.games,
      ]);
  }

  type Effort = { date: string; effortDelta: number; matchId: string | number };
  function effortRows(
    effortList: Effort[] = []
  ): [string, string, string | number][] {
    return effortList.map((e) => [e.date, e.effortDelta.toFixed(2), e.matchId]);
  }

  return (
    <div className="main-container" style={{ position: "relative" }}>
      {/* Logout button in top right */}
      <IconButton
        aria-label="Déconnexion"
        onClick={handleLogout}
        className={styles.logoutButton}
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "#f5f7fa",
          color: "#1976d2",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          "&:hover": {
            background: "#e3eaf7",
            color: "#1565c0",
          },
          zIndex: 100,
        }}
      >
        <LogoutIcon />
      </IconButton>

      <div
        className="form-container"
        style={{ maxWidth: "1100px", width: "100%" }}
      >
        <h2 className="form-title">
          Analyse de l&apos;équipe adverse pour le prochain match
        </h2>

        {/* New: Dedicated analysis-form classes */}
        <form className="analysis-form" onSubmit={handleSubmit}>
          <label className="analysis-form-label">
            Team Id&nbsp;
            <input
              className="analysis-form-input"
              type="text"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
              placeholder="ID"
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
              onChange={(e) => setNumSeasons(Number(e.target.value))}
              required
            />
          </label>
          <button type="submit" className="analysis-form-submit">
            Analyser
          </button>
        </form>

        {loading && <div>Analyse de l&apos;équipe en cours...</div>}
        {err && <div className="form-error">{err}</div>}

        {analysis && !loading && !err && (
          <>
            <div className="analysis-section">
              <div className="analysis-title">
                Équipe analysée : {analysis.opponentName} (ID :{" "}
                {analysis.opponentId})
              </div>
              {seasonLabels.length > 0 && (
                <div className="analysis-subtitle">
                  Saisons analysées :
                  {seasonLabels.map((s: number, i: number) => (
                    <span key={s} style={{ marginLeft: 10 }}>
                      {s}
                      {i === 0 ? " (actuelle)" : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="analysis-section">
              <div className="analysis-title">Stratégies offensives</div>
              {renderTable(
                [
                  "Stratégie",
                  ...seasonLabels.map((s: string) => `Occurrences (S${s})`),
                ],
                stratRows(
                  analysis.seasonsData?.map(
                    (x: any) => x.offenseStrategies
                  ) ?? [
                    analysis.curr?.offenseStrategies,
                    analysis.prev?.offenseStrategies,
                  ]
                )
              )}
            </div>
            <div className="analysis-section">
              <div className="analysis-title">Stratégies défensives</div>
              {renderTable(
                [
                  "Stratégie",
                  ...seasonLabels.map((s: string) => `Occurrences (S${s})`),
                ],
                stratRows(
                  analysis.seasonsData?.map(
                    (x: any) => x.defenseStrategies
                  ) ?? [
                    analysis.curr?.defenseStrategies,
                    analysis.prev?.defenseStrategies,
                  ]
                )
              )}
            </div>
            <div className="analysis-section">
              <div className="analysis-title">
                Notes moyennes de l&apos;équipe
              </div>
              {renderTable(
                [
                  "Catégorie",
                  ...seasonLabels.map((s: string) => `Moyenne (S${s})`),
                ],
                avgRows(
                  analysis.seasonsData?.map((x: any) => x.avgRatings) ?? [
                    analysis.curr?.avgRatings,
                    analysis.prev?.avgRatings,
                  ]
                )
              )}
            </div>
            <div className="analysis-section">
              <div className="analysis-title">
                Points moyens par 100 tirs selon le poste
              </div>
              {renderTable(
                [
                  "Poste",
                  ...seasonLabels.map((s: string) => `Moyenne (S${s})`),
                ],
                effRows(
                  analysis.seasonsData?.map((x: any) => x.avgEfficiency) ?? [
                    analysis.curr?.avgEfficiency,
                    analysis.prev?.avgEfficiency,
                  ]
                )
              )}
            </div>
            <div className="analysis-section">
              <div className="analysis-title">
                Statistiques des joueurs (moyennes, saison actuelle)
              </div>
              {renderTable(
                [
                  "Joueur",
                  "PTS",
                  "AST",
                  "REB",
                  "BLK",
                  "STL",
                  "BP",
                  "FP",
                  "MIN",
                  "Matchs",
                ],
                playerRows(
                  analysis.seasonsData?.[0]?.playerSumStats ??
                    analysis.curr?.playerSumStats
                )
              )}
            </div>
            <div className="analysis-section">
              <div className="analysis-title">
                Variation d&apos;effort par match (saison actuelle)
              </div>
              {renderTable(
                ["Date", "Variation d'effort", "MatchID"],
                effortRows(
                  analysis.seasonsData?.[0]?.effortDeltaList ??
                    analysis.curr?.effortDeltaList
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
