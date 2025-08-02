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

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    table: string;
    column: number;
    direction: "asc" | "desc";
  } | null>(null);

  // Collapsed sections state - all collapsed by default
  const [collapsedSections, setCollapsedSections] = useState({
    "offense-strategies": true,
    "defense-strategies": true,
    "avg-ratings": true,
    "avg-efficiency": true,
    "player-stats": true,
    "effort-variation": true,
  });

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

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Sorting function
  const handleSort = (tableId: string, columnIndex: number) => {
    let direction: "asc" | "desc" = "asc";

    if (
      sortConfig &&
      sortConfig.table === tableId &&
      sortConfig.column === columnIndex &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }

    setSortConfig({ table: tableId, column: columnIndex, direction });
  };

  // Generic sort function for table rows
  const sortRows = (
    rows: (string | number)[][],
    tableId: string
  ): (string | number)[][] => {
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

  function renderTable(
    headers: string[],
    rows: (string | number)[][],
    tableId: string
  ) {
    const sortedRows = sortRows(rows, tableId);

    return (
      <table className="table-analysis">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                onClick={() => handleSort(tableId, i)}
                style={{
                  cursor: "pointer",
                  userSelect: "none",
                  backgroundColor:
                    sortConfig?.table === tableId && sortConfig?.column === i
                      ? "#f0f0f0"
                      : "transparent",
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

  // Render collapsible section
  function renderCollapsibleSection(
    sectionId: string,
    title: string,
    content: React.ReactNode
  ) {
    const isCollapsed = collapsedSections[sectionId];

    return (
      <div className="analysis-section">
        <div
          className="analysis-title"
          onClick={() => toggleSection(sectionId)}
          style={{
            cursor: "pointer",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid #e0e0e0",
            marginBottom: isCollapsed ? 0 : "15px",
          }}
        >
          <span>{title}</span>
          <span
            style={{
              fontSize: "18px",
              fontWeight: "normal",
              transition: "transform 0.2s ease",
            }}
          >
            {isCollapsed ? "▶" : "▼"}
          </span>
        </div>
        {!isCollapsed && <div style={{ paddingTop: "15px" }}>{content}</div>}
      </div>
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

            {renderCollapsibleSection(
              "offense-strategies",
              "Stratégies offensives",
              renderTable(
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
                ),
                "offense-strategies"
              )
            )}

            {renderCollapsibleSection(
              "defense-strategies",
              "Stratégies défensives",
              renderTable(
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
                ),
                "defense-strategies"
              )
            )}

            {renderCollapsibleSection(
              "avg-ratings",
              "Notes moyennes de l'équipe",
              renderTable(
                [
                  "Catégorie",
                  ...seasonLabels.map((s: string) => `Moyenne (S${s})`),
                ],
                avgRows(
                  analysis.seasonsData?.map((x: any) => x.avgRatings) ?? [
                    analysis.curr?.avgRatings,
                    analysis.prev?.avgRatings,
                  ]
                ),
                "avg-ratings"
              )
            )}

            {renderCollapsibleSection(
              "avg-efficiency",
              "Points moyens par 100 tirs selon le poste",
              renderTable(
                [
                  "Poste",
                  ...seasonLabels.map((s: string) => `Moyenne (S${s})`),
                ],
                effRows(
                  analysis.seasonsData?.map((x: any) => x.avgEfficiency) ?? [
                    analysis.curr?.avgEfficiency,
                    analysis.prev?.avgEfficiency,
                  ]
                ),
                "avg-efficiency"
              )
            )}

            {renderCollapsibleSection(
              "player-stats",
              "Statistiques des joueurs (moyennes, saison actuelle)",
              renderTable(
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
                ),
                "player-stats"
              )
            )}

            {renderCollapsibleSection(
              "effort-variation",
              "Variation d'effort par match (saison actuelle)",
              renderTable(
                ["Date", "Variation d'effort", "MatchID"],
                effortRows(
                  analysis.seasonsData?.[0]?.effortDeltaList ??
                    analysis.curr?.effortDeltaList
                ),
                "effort-variation"
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
