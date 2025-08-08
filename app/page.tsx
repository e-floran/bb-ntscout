/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import IconButton from "@mui/material/IconButton";
import LogoutIcon from "@mui/icons-material/Logout";
import { LinearProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { PlayerHistoryCard } from "@/app/components/PlayerHistoryCard";

// Utility to humanize camelCase/PascalCase for display
function humanize(str: string) {
  if (!str) return "";
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

interface LoadingStep {
  step: string;
  completed: boolean;
  current: boolean;
}

type AnalysisResult = any;

type SectionId =
  | "offense-strategies"
  | "defense-strategies"
  | "avg-ratings"
  | "avg-efficiency"
  | "player-stats"
  | "effort-variation"
  | "player-history"; // NEW: Add player history section

// Strategy filter options
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

// Strategy groups
const INTERIOR_OFFENSES = ["Look Inside", "Low Post"];
const NEUTRAL_OFFENSES = [
  "Base",
  "Push",
  "Patient",
  "Outside Isolation",
  "Inside Isolation",
];
const EXTERIOR_OFFENSES = ["Motion", "Run And Gun", "Princeton"];

export default function IndexPage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  // New: form state
  const [teamId, setTeamId] = useState("");
  const [numSeasons, setNumSeasons] = useState<number>(2);

  // Loading states
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([]);
  const [showSkeletons, setShowSkeletons] = useState(false);

  // Strategy filters
  const [selectedOffensiveStrategy, setSelectedOffensiveStrategy] =
    useState("all");
  const [selectedDefensiveStrategy, setSelectedDefensiveStrategy] =
    useState("all");

  // Raw match data for filtering
  const [rawMatchData, setRawMatchData] = useState<any>(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    table: string;
    column: number;
    direction: "asc" | "desc";
  } | null>(null);

  // Collapsed sections state - all collapsed by default
  const [collapsedSections, setCollapsedSections] = useState<
    Record<SectionId, boolean>
  >({
    "offense-strategies": true,
    "defense-strategies": true,
    "avg-ratings": true,
    "avg-efficiency": true,
    "player-stats": true,
    "effort-variation": true,
    "player-history": false, // NEW: Start expanded for player history
  });

  const router = useRouter();

  // Check if match satisfies offensive strategy filter
  const matchesOffensiveFilter = (offStrategy: string) => {
    if (selectedOffensiveStrategy === "all") return true;
    if (selectedOffensiveStrategy === "interior")
      return INTERIOR_OFFENSES.includes(offStrategy);
    if (selectedOffensiveStrategy === "neutral")
      return NEUTRAL_OFFENSES.includes(offStrategy);
    if (selectedOffensiveStrategy === "exterior")
      return EXTERIOR_OFFENSES.includes(offStrategy);
    return offStrategy === selectedOffensiveStrategy;
  };

  // Check if match satisfies defensive strategy filter
  const matchesDefensiveFilter = (defStrategy: string) => {
    if (selectedDefensiveStrategy === "all") return true;
    return defStrategy === selectedDefensiveStrategy;
  };

  // Filter and recalculate data based on selected strategies
  const getFilteredData = () => {
    if (
      !rawMatchData ||
      (!selectedOffensiveStrategy && !selectedDefensiveStrategy)
    ) {
      return analysis;
    }

    // Filter matches based on both offensive and defensive strategies (AND logic)
    const filteredData = { ...analysis };

    if (rawMatchData.seasonsData) {
      filteredData.seasonsData = rawMatchData.seasonsData.map(
        (seasonData: any) => {
          const filteredMatches =
            seasonData.matches?.filter(
              (match: any) =>
                matchesOffensiveFilter(match.offStrategy) &&
                matchesDefensiveFilter(match.defStrategy)
            ) || [];

          // Recalculate averages based on filtered matches
          return recalculateSeasonStats(filteredMatches, seasonData);
        }
      );
    }

    return filteredData;
  };

  // Recalculate season statistics from filtered matches
  const recalculateSeasonStats = (matches: any[], originalSeasonData: any) => {
    if (matches.length === 0) {
      return {
        ...originalSeasonData,
        avgRatings: {},
        avgEfficiency: {},
        playerSumStats: {},
      };
    }

    // Recalculate average ratings
    const avgRatings: any = {};
    const ratingCounts: any = {};
    matches.forEach((match) => {
      Object.entries(match.ratings || {}).forEach(
        ([key, value]: [string, any]) => {
          if (!avgRatings[key]) avgRatings[key] = 0;
          if (!ratingCounts[key]) ratingCounts[key] = 0;
          avgRatings[key] += value;
          ratingCounts[key]++;
        }
      );
    });
    Object.keys(avgRatings).forEach((key) => {
      avgRatings[key] = avgRatings[key] / ratingCounts[key];
    });

    // Recalculate average efficiency
    const avgEfficiency: any = {};
    const efficiencyCounts: any = {};
    matches.forEach((match) => {
      Object.entries(match.efficiency || {}).forEach(
        ([key, value]: [string, any]) => {
          if (!avgEfficiency[key]) avgEfficiency[key] = 0;
          if (!efficiencyCounts[key]) efficiencyCounts[key] = 0;
          avgEfficiency[key] += value;
          efficiencyCounts[key]++;
        }
      );
    });
    Object.keys(avgEfficiency).forEach((key) => {
      avgEfficiency[key] = avgEfficiency[key] / efficiencyCounts[key];
    });

    // Recalculate player statistics
    const playerSumStats: any = {};
    matches.forEach((match) => {
      Object.entries(match.playerStats || {}).forEach(
        ([playerId, stats]: [string, any]) => {
          if (!playerSumStats[playerId]) {
            playerSumStats[playerId] = {
              name: stats.name,
              pts: 0,
              ast: 0,
              reb: 0,
              blk: 0,
              stl: 0,
              to: 0,
              pf: 0,
              min: 0,
              games: 0,
            };
          }
          const player = playerSumStats[playerId];
          player.pts += stats.pts || 0;
          player.ast += stats.ast || 0;
          player.reb += stats.reb || 0;
          player.blk += stats.blk || 0;
          player.stl += stats.stl || 0;
          player.to += stats.to || 0;
          player.pf += stats.pf || 0;
          player.min += stats.min || 0;
          player.games += 1;
        }
      );
    });

    return {
      ...originalSeasonData,
      avgRatings,
      avgEfficiency,
      playerSumStats,
    };
  };

  // Get filtered analysis data
  const filteredAnalysis = getFilteredData();

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

  // Simulate loading steps
  const simulateLoadingSteps = () => {
    const steps: LoadingStep[] = [
      { step: "Connexion à l'API", completed: false, current: true },
      {
        step: "Récupération des données d'équipe",
        completed: false,
        current: false,
      },
      { step: "Analyse des saisons", completed: false, current: false },
      { step: "Calcul des statistiques", completed: false, current: false },
      { step: "Génération des rapports", completed: false, current: false },
      { step: "Finalisation de l'analyse", completed: false, current: false },
    ];

    setLoadingSteps(steps);
    setShowSkeletons(true);

    steps.forEach((_, index) => {
      setTimeout(() => {
        setLoadingSteps((prev) =>
          prev.map((step, i) => ({
            ...step,
            completed: i <= index,
            current: i === index + 1,
          }))
        );
      }, (index + 1) * 600);
    });

    // Hide skeletons after steps complete
    setTimeout(() => {
      setShowSkeletons(false);
    }, steps.length * 600 + 300);
  };

  // Load main data on mount
  useEffect(() => {
    setLoading(true);
    setErr("");
    setAnalysis(null);
    setRawMatchData(null);
    simulateLoadingSteps();

    fetch("/api/analyzeTeam")
      .then(async (res) => {
        const data = await res.json();
        if (data.error) setErr(data.error);
        else {
          setAnalysis(data);
          setRawMatchData(data); // Store raw data for filtering
        }
      })
      .catch((e) => setErr(e.message))
      .finally(() => {
        setLoading(false);
        setLoadingSteps([]);
        setShowSkeletons(false);
      });
  }, []);

  // Form handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setAnalysis(null);
    setRawMatchData(null);
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

    simulateLoadingSteps();

    const params = new URLSearchParams({
      teamId: teamId.trim(),
      numberOfSeasons: String(numSeasons),
    }).toString();

    const res = await fetch(`/api/analyzeTeam?${params}`);
    const data = await res.json();
    if (data.error) setErr(data.error);
    else {
      setAnalysis(data);
      setRawMatchData(data); // Store raw data for filtering
    }

    setLoading(false);
    setLoadingSteps([]);
    setShowSkeletons(false);
  }

  // Toggle section collapse
  const toggleSection = (sectionId: SectionId) => {
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

  // Loading Progress Component
  const LoadingProgress = () => (
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

  // Skeleton Loading Component
  const SkeletonTable = ({ rows = 5, cols = 4 }) => (
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

  // Render collapsible section
  function renderCollapsibleSection(
    sectionId: SectionId,
    title: string,
    content: React.ReactNode
  ) {
    const isCollapsed = collapsedSections[sectionId];

    if (showSkeletons) {
      return (
        <div className="analysis-section">
          <div
            className="analysis-title"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid #e0e0e0",
              marginBottom: "15px",
            }}
          >
            <span>{title}</span>
            <span style={{ fontSize: "18px" }}>▼</span>
          </div>
          <SkeletonTable />
        </div>
      );
    }

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
    filteredAnalysis && filteredAnalysis.seasons
      ? filteredAnalysis.seasons
      : filteredAnalysis &&
        filteredAnalysis.season &&
        filteredAnalysis.prevSeason
      ? [filteredAnalysis.season, filteredAnalysis.prevSeason]
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
              onChange={(e) => setNumSeasons(Number(e.target.value))}
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

        {loading && <LoadingProgress />}

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

            {/* Strategy Filters */}
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
                    onChange={(e) =>
                      setSelectedOffensiveStrategy(e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #ced4da",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      fontSize: "0.9rem",
                    }}
                  >
                    {Object.entries(OFFENSIVE_STRATEGIES).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
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
                    onChange={(e) =>
                      setSelectedDefensiveStrategy(e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #ced4da",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      fontSize: "0.9rem",
                    }}
                  >
                    {Object.entries(DEFENSIVE_STRATEGIES).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              {(selectedOffensiveStrategy !== "all" ||
                selectedDefensiveStrategy !== "all") && (
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
                  Filtres actifs - Les données ci-dessous sont filtrées selon
                  les stratégies sélectionnées
                </div>
              )}
            </div>

            {/* NEW: Player History Section */}
            {filteredAnalysis?.seasonsData?.[0]?.players &&
              filteredAnalysis.seasonsData[0].players.length > 0 &&
              renderCollapsibleSection(
                "player-history",
                `Joueurs avec historique GS/DMI (${filteredAnalysis.seasonsData[0].players.length} joueurs)`,
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {filteredAnalysis.seasonsData[0].players.map(
                    (player: any) => (
                      <PlayerHistoryCard key={player.id} player={player}>
                        <div
                          style={{
                            padding: "8px",
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "600",
                              fontSize: "14px",
                              marginBottom: "4px",
                            }}
                          >
                            {player.name}
                          </div>
                          {player.position && (
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>
                              Position: {player.position}
                            </div>
                          )}
                        </div>
                      </PlayerHistoryCard>
                    )
                  )}
                </div>
              )}

            {renderCollapsibleSection(
              "offense-strategies",
              "Stratégies offensives",
              renderTable(
                ["Stratégies", ...seasonLabels.map((s: any) => `Saison ${s}`)],
                stratRows(
                  filteredAnalysis?.seasonsData?.map(
                    (s: any) => s?.offenseStrategies || {}
                  ) || []
                ),
                "offense-strategies"
              )
            )}

            {renderCollapsibleSection(
              "defense-strategies",
              "Stratégies défensives",
              renderTable(
                ["Stratégies", ...seasonLabels.map((s: any) => `Saison ${s}`)],
                stratRows(
                  filteredAnalysis?.seasonsData?.map(
                    (s: any) => s?.defenseStrategies || {}
                  ) || []
                ),
                "defense-strategies"
              )
            )}

            {renderCollapsibleSection(
              "avg-ratings",
              "Moyennes des ratings équipe",
              renderTable(
                ["Catégorie", ...seasonLabels.map((s: any) => `Saison ${s}`)],
                avgRows(
                  filteredAnalysis?.seasonsData?.map(
                    (s: any) => s?.avgRatings || {}
                  ) || []
                ),
                "avg-ratings"
              )
            )}

            {renderCollapsibleSection(
              "avg-efficiency",
              "Efficacité moyenne par poste",
              renderTable(
                ["Position", ...seasonLabels.map((s: any) => `Saison ${s}`)],
                effRows(
                  filteredAnalysis?.seasonsData?.map(
                    (s: any) => s?.avgEfficiency || {}
                  ) || []
                ),
                "avg-efficiency"
              )
            )}

            {renderCollapsibleSection(
              "player-stats",
              "Statistiques joueurs (moyennes par match)",
              renderTable(
                [
                  "Joueur",
                  "PTS",
                  "AST",
                  "REB",
                  "BLK",
                  "STL",
                  "TO",
                  "PF",
                  "MIN",
                  "GP",
                ],
                playerRows(
                  filteredAnalysis?.seasonsData?.[0]?.playerSumStats || {}
                ),
                "player-stats"
              )
            )}

            {renderCollapsibleSection(
              "effort-variation",
              "Variation d'effort par match",
              <div>
                {filteredAnalysis?.seasonsData?.[0]?.effortDeltaList &&
                filteredAnalysis.seasonsData[0].effortDeltaList.length > 0 ? (
                  renderTable(
                    ["Date", "Delta d'effort", "Match ID"],
                    effortRows(filteredAnalysis.seasonsData[0].effortDeltaList),
                    "effort-variation"
                  )
                ) : (
                  <p>
                    Aucune donnée d&apos;effort disponible pour cette équipe.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
