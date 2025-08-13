/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import IconButton from "@mui/material/IconButton";
import LogoutIcon from "@mui/icons-material/Logout";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { PlayerHistoryCard } from "@/app/components/PlayerHistoryCard";
import { TeamAnalysisForm } from "@/app/components/TeamAnalysisForm";
import { LoadingProgress } from "@/app/components/LoadingProgress";
import { StrategyFilters } from "@/app/components/StrategyFilters";
import { CollapsibleSection } from "@/app/components/CollapsibleSection";
import { DataTable } from "@/app/components/DataTable";
import { useDataFiltering } from "@/app/hooks/useDataFiltering";
import {
  stratRows,
  avgRows,
  effRows,
  playerRows,
  effortRows,
} from "@/app/utils/dataProcessing";

interface LoadingStep {
  step: string;
  completed: boolean;
  current: boolean;
}

type AnalysisResult = any;

export type SectionId =
  | "offense-strategies"
  | "defense-strategies"
  | "avg-ratings"
  | "avg-efficiency"
  | "player-stats"
  | "effort-variation"
  | "player-history";

const stepDuration = 2000;

export default function IndexPage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
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
    "player-history": true,
  });

  const router = useRouter();

  // Use the custom hook for data filtering
  const filteredAnalysis = useDataFiltering(
    analysis,
    rawMatchData,
    selectedOffensiveStrategy,
    selectedDefensiveStrategy
  );

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
      }, (index + 1) * stepDuration);
    });

    // Hide skeletons after steps complete
    setTimeout(() => {
      setShowSkeletons(false);
    }, steps.length * stepDuration + 300);
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
          setRawMatchData(data);
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
      setRawMatchData(data);
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

  const seasonLabels =
    filteredAnalysis && filteredAnalysis.seasons
      ? filteredAnalysis.seasons
      : filteredAnalysis &&
        filteredAnalysis.season &&
        filteredAnalysis.prevSeason
      ? [filteredAnalysis.season, filteredAnalysis.prevSeason]
      : [];

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
        style={{ maxWidth: "1800px", width: "100%" }}
      >
        <h2 className="form-title">
          Analyse de l&apos;équipe adverse pour le prochain match
        </h2>

        <TeamAnalysisForm
          teamId={teamId}
          numSeasons={numSeasons}
          loading={loading}
          onTeamIdChange={setTeamId}
          onNumSeasonsChange={setNumSeasons}
          onSubmit={handleSubmit}
        />

        {loading && <LoadingProgress loadingSteps={loadingSteps} />}

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

            <StrategyFilters
              selectedOffensiveStrategy={selectedOffensiveStrategy}
              selectedDefensiveStrategy={selectedDefensiveStrategy}
              onOffensiveStrategyChange={setSelectedOffensiveStrategy}
              onDefensiveStrategyChange={setSelectedDefensiveStrategy}
            />

            {/* Player History Section */}
            {filteredAnalysis?.seasonsData?.[0]?.players &&
              filteredAnalysis.seasonsData[0].players.length > 0 && (
                <CollapsibleSection
                  sectionId="player-history"
                  title={`Joueurs avec historique GS/DMI (${filteredAnalysis.seasonsData[0].players.length} joueurs)`}
                  isCollapsed={collapsedSections["player-history"]}
                  showSkeletons={showSkeletons}
                  onToggle={toggleSection}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {filteredAnalysis.seasonsData[0].players
                      .sort((a: any, b: any) => {
                        // Get current week DMI for both players
                        const currentWeekA = a.currentDMI || 0;
                        const currentWeekB = b.currentDMI || 0;

                        // Sort by current week DMI in descending order (highest first)
                        return currentWeekB - currentWeekA;
                      })
                      .map((player: any) => (
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
                              <div
                                style={{ fontSize: "12px", color: "#6b7280" }}
                              >
                                Position: {player.position}
                              </div>
                            )}
                          </div>
                        </PlayerHistoryCard>
                      ))}
                  </div>
                </CollapsibleSection>
              )}

            <CollapsibleSection
              sectionId="offense-strategies"
              title="Stratégies offensives"
              isCollapsed={collapsedSections["offense-strategies"]}
              showSkeletons={showSkeletons}
              onToggle={toggleSection}
            >
              <DataTable
                headers={[
                  "Stratégies",
                  ...seasonLabels.map((s: any) => `Saison ${s}`),
                ]}
                rows={stratRows(
                  filteredAnalysis?.seasonsData?.map(
                    (s: any) => s?.offenseStrategies || {}
                  ) || []
                )}
                tableId="offense-strategies"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </CollapsibleSection>

            <CollapsibleSection
              sectionId="defense-strategies"
              title="Stratégies défensives"
              isCollapsed={collapsedSections["defense-strategies"]}
              showSkeletons={showSkeletons}
              onToggle={toggleSection}
            >
              <DataTable
                headers={[
                  "Stratégies",
                  ...seasonLabels.map((s: any) => `Saison ${s}`),
                ]}
                rows={stratRows(
                  filteredAnalysis?.seasonsData?.map(
                    (s: any) => s?.defenseStrategies || {}
                  ) || []
                )}
                tableId="defense-strategies"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </CollapsibleSection>

            <CollapsibleSection
              sectionId="avg-ratings"
              title="Moyennes des ratings équipe"
              isCollapsed={collapsedSections["avg-ratings"]}
              showSkeletons={showSkeletons}
              onToggle={toggleSection}
            >
              <DataTable
                headers={[
                  "Catégorie",
                  ...seasonLabels.map((s: any) => `Saison ${s}`),
                ]}
                rows={avgRows(
                  filteredAnalysis?.seasonsData?.map(
                    (s: any) => s?.avgRatings || {}
                  ) || []
                )}
                tableId="avg-ratings"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </CollapsibleSection>

            <CollapsibleSection
              sectionId="avg-efficiency"
              title="Efficacité moyenne par poste"
              isCollapsed={collapsedSections["avg-efficiency"]}
              showSkeletons={showSkeletons}
              onToggle={toggleSection}
            >
              <DataTable
                headers={[
                  "Position",
                  ...seasonLabels.map((s: any) => `Saison ${s}`),
                ]}
                rows={effRows(
                  filteredAnalysis?.seasonsData?.map(
                    (s: any) => s?.avgEfficiency || {}
                  ) || []
                )}
                tableId="avg-efficiency"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </CollapsibleSection>

            <CollapsibleSection
              sectionId="player-stats"
              title="Statistiques joueurs (moyennes par match)"
              isCollapsed={collapsedSections["player-stats"]}
              showSkeletons={showSkeletons}
              onToggle={toggleSection}
            >
              <DataTable
                headers={[
                  "Joueur",
                  "GP",
                  "PTS",
                  "FG%",
                  "Avg FGM",
                  "3P%",
                  "Avg 3PM",
                  "AST",
                  "REB",
                  "BLK",
                  "STL",
                  "TO",
                  "PF",
                  "MIN",
                ]}
                rows={playerRows(
                  filteredAnalysis?.seasonsData?.[0]?.playerSumStats || {}
                )}
                tableId="player-stats"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </CollapsibleSection>

            <CollapsibleSection
              sectionId="effort-variation"
              title="Variation d'effort par match"
              isCollapsed={collapsedSections["effort-variation"]}
              showSkeletons={showSkeletons}
              onToggle={toggleSection}
            >
              {filteredAnalysis?.seasonsData?.[0]?.effortDeltaList &&
              filteredAnalysis.seasonsData[0].effortDeltaList.length > 0 ? (
                <DataTable
                  headers={["Date", "Delta d'effort", "Match ID"]}
                  rows={effortRows(
                    filteredAnalysis.seasonsData[0].effortDeltaList
                  )}
                  tableId="effort-variation"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              ) : (
                <p>Aucune donnée d&apos;effort disponible pour cette équipe.</p>
              )}
            </CollapsibleSection>
          </>
        )}
      </div>
    </div>
  );
}
