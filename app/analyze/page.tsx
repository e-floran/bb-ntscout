/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { PlayerHistoryCard } from "@/app/components/analyze/PlayerHistoryCard";
import { TeamAnalysisForm } from "@/app/components/analyze/TeamAnalysisForm";
import { LoadingProgress } from "@/app/components/analyze/LoadingProgress";
import { StrategyFilters } from "@/app/components/analyze/StrategyFilters";
import { CollapsibleSection } from "@/app/components/analyze/CollapsibleSection";
import { DataTable } from "@/app/components/analyze/DataTable";
import { RecentGamesCard } from "@/app/components/analyze/RecentGamesCard";
import { ScoutedPlayersSection } from "@/app/components/analyze/ScoutedPlayersSection";
import { useDataFiltering } from "@/app/hooks/useDataFiltering";
import {
  stratRows,
  avgRows,
  effRows,
  effortRows,
  gdpRows,
  multiSeasonPlayerRows,
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
  | "strategy-likelihood"
  | "avg-ratings"
  | "avg-efficiency"
  | "player-stats"
  | "effort-variation"
  | "player-history"
  | "recent-games"
  | "scouted-players"
  | "gdp";

const stepDuration = 2000;

export default function AnalyzePage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [teamId, setTeamId] = useState("");
  const [numSeasons, setNumSeasons] = useState<number>(1);

  // Loading states
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([]);
  const [showSkeletons, setShowSkeletons] = useState(false);

  // Strategy filters
  const [selectedOffensiveStrategy, setSelectedOffensiveStrategy] =
    useState("all");
  const [selectedDefensiveStrategy, setSelectedDefensiveStrategy] =
    useState("all");
  const [excludeIrrelevantGames, setExcludeIrrelevantGames] = useState(true);

  // Raw match data for filtering
  const [rawMatchData, setRawMatchData] = useState<any>(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    table: string;
    column: number;
    direction: "asc" | "desc";
  } | null>(null);

  // Collapsed sections state - all collapsed by default (including recent games)
  const [collapsedSections, setCollapsedSections] = useState<
    Record<SectionId, boolean>
  >({
    "offense-strategies": true,
    "defense-strategies": true,
    "strategy-likelihood": true,
    "avg-ratings": true,
    "avg-efficiency": true,
    "player-stats": true,
    "effort-variation": true,
    "player-history": true,
    "recent-games": true,
    "scouted-players": true,
    gdp: true,
  });

  // Use the custom hook for data filtering
  const filteredAnalysis = useDataFiltering(
    analysis,
    rawMatchData,
    selectedOffensiveStrategy,
    selectedDefensiveStrategy,
    excludeIrrelevantGames
  );

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
        if (data.error === "Not authenticated") {
          setErr("Vous devez vous connecter.");
        } else if (data.error === "session_expired") {
          window.location.href = "/login?message=session_expired";
          return;
        } else if (data.error === "Session expired") {
          setErr("Votre session a expiré, veuillez vous reconnecter.");
        } else {
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
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
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
      <div
        className="form-container"
        style={{ maxWidth: "1800px", width: "100%" }}
      >
        <h2 className="form-title">
          {analysis && !loading && !err
            ? "Analyse de " + analysis.opponentName
            : "Analyse de l'équipe adverse pour le prochain match"}
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
              <a
                href={`https://www.buzzerbeater.com/country/${
                  analysis.opponentId > 1000
                    ? analysis.opponentId - 1000
                    : analysis.opponentId
                }/${analysis.opponentId > 1000 ? "jnt" : "nt"}/overview.aspx`}
                target="_blank"
                className="analysis-title"
              >
                Équipe analysée : {analysis.opponentName} (ID :{" "}
                {analysis.opponentId})
              </a>
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
              excludeIrrelevantGames={excludeIrrelevantGames}
              onExcludeIrrelevantGamesChange={setExcludeIrrelevantGames}
            />

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
              sectionId="strategy-likelihood"
              title="Probabilité des stratégies (basée sur la forme des joueurs)"
              isCollapsed={collapsedSections["strategy-likelihood"]}
              showSkeletons={showSkeletons}
              onToggle={toggleSection}
            >
              {filteredAnalysis?.seasonsData?.[0]?.strategyLikelihood ? (
                <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
                  <div style={{ minWidth: "300px", flex: 1 }}>
                    <h4 style={{ marginBottom: "16px", color: "#374151" }}>
                      Stratégies Offensives
                    </h4>
                    <DataTable
                      headers={["Stratégie", "Utilisations", "Score"]}
                      rows={
                        filteredAnalysis.seasonsData[0].strategyLikelihood.offense?.map(
                          (item: any) => [
                            item.strategy,
                            item.usage.toString(),
                            item.weightedScore.toString(),
                          ]
                        ) || []
                      }
                      tableId="strategy-likelihood-offense"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </div>
                  <div style={{ minWidth: "300px", flex: 1 }}>
                    <h4 style={{ marginBottom: "16px", color: "#374151" }}>
                      Stratégies Défensives
                    </h4>
                    <DataTable
                      headers={["Stratégie", "Utilisations", "Score"]}
                      rows={
                        filteredAnalysis.seasonsData[0].strategyLikelihood.defense?.map(
                          (item: any) => [
                            item.strategy,
                            item.usage.toString(),
                            item.weightedScore.toString(),
                          ]
                        ) || []
                      }
                      tableId="strategy-likelihood-defense"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </div>
                </div>
              ) : (
                <p>
                  Aucune donnée de probabilité disponible pour cette équipe.
                </p>
              )}
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                <strong>Explication:</strong> Cette section analyse la
                probabilité d&apos;utilisation des stratégies basée sur:
                <br />• Le pourcentage de forme par rapport au dernier GS=9 de
                chaque joueur
                <br />• Le temps de jeu de chaque joueur avec chaque stratégie
                <br />• L&apos;historique d&apos;utilisation des stratégies
                cette saison
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              sectionId="avg-ratings"
              title="Notes d'équipe"
              isCollapsed={collapsedSections["avg-ratings"]}
              showSkeletons={showSkeletons}
              onToggle={toggleSection}
            >
              <DataTable
                headers={[
                  "Catégorie",
                  // First season (current)
                  `Moyennes s${seasonLabels[0] || ""}`,
                  `Max s${seasonLabels[0] || ""}`,
                  // Main team columns after current season
                  `Mes moyennes s${seasonLabels[0] || ""}`,
                  `Mes max s${seasonLabels[0] || ""}`,
                  // Remaining seasons if any
                  ...seasonLabels
                    .slice(1)
                    .flatMap((s: any) => [`Moyennes s${s}`, `Max s${s}`]),
                ]}
                rows={avgRows(
                  filteredAnalysis?.seasonsData?.map(
                    (s: any) => s?.avgRatings || {}
                  ) || [],
                  analysis?.mainTeamAverages?.avgRatings,
                  analysis?.mainTeamAverages?.maxRatings
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
                  // First season (current)
                  `Saison ${seasonLabels[0] || ""}`,
                  // Main team column after current season
                  `Mon équipe (s${seasonLabels[0] || ""})`,
                  // Remaining seasons if any
                  ...seasonLabels.slice(1).map((s: any) => `Saison ${s}`),
                ]}
                rows={effRows(
                  filteredAnalysis?.seasonsData?.map(
                    (s: any) => s?.avgEfficiency || {}
                  ) || [],
                  analysis?.mainTeamAverages?.avgEfficiency
                )}
                tableId="avg-efficiency"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </CollapsibleSection>

            <CollapsibleSection
              sectionId="player-stats"
              title={`Statistiques joueurs (moyennes sur ${
                seasonLabels.length
              } saison${seasonLabels.length > 1 ? "s" : ""})`}
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
                  "FG M-A",
                  "3P%",
                  "3P M-A",
                  "AST",
                  "REB",
                  "BLK",
                  "STL",
                  "TO",
                  "PF",
                  "MIN",
                ]}
                rows={multiSeasonPlayerRows(
                  filteredAnalysis?.seasonsData || []
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
                  headers={["Date", "Delta d'effort", "Match ID", "Adversaire"]}
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

            <CollapsibleSection
              sectionId="gdp"
              title="Historique PAM"
              isCollapsed={collapsedSections["gdp"]}
              showSkeletons={showSkeletons}
              onToggle={toggleSection}
            >
              {filteredAnalysis?.seasonsData?.[0]?.effortDeltaList &&
              filteredAnalysis.seasonsData[0].effortDeltaList.length > 0 ? (
                <DataTable
                  headers={["Date", "Adversaire", "PAM"]}
                  rows={gdpRows(filteredAnalysis.seasonsData[0].gdpList)}
                  tableId="gdp"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              ) : (
                <p>Aucune donnée d&apos;effort disponible pour cette équipe.</p>
              )}
            </CollapsibleSection>

            {/* Scouted Players Section */}
            <ScoutedPlayersSection
              teamId={analysis?.opponentId || null}
              isCollapsed={collapsedSections["scouted-players"]}
              onToggle={toggleSection}
              sortConfig={sortConfig}
              onSort={handleSort}
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
                            <a
                              style={{
                                fontWeight: "600",
                                fontSize: "14px",
                                marginBottom: "4px",
                              }}
                              target="_blank"
                              href={`https://www.buzzerbeater.com/player/${player.id}/overview.aspx`}
                            >
                              {player.name}
                            </a>
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

            {/* Recent Games Section - moved to bottom and collapsed by default */}
            {filteredAnalysis?.seasonsData?.[0]?.recentGames &&
              filteredAnalysis.seasonsData[0].recentGames.length > 0 && (
                <CollapsibleSection
                  sectionId="recent-games"
                  title={`Tous les matchs de la saison (${filteredAnalysis.seasonsData[0].recentGames.length} matchs)`}
                  isCollapsed={collapsedSections["recent-games"]}
                  showSkeletons={showSkeletons}
                  onToggle={toggleSection}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    {filteredAnalysis.seasonsData[0].recentGames.map(
                      (game: any) => (
                        <RecentGamesCard
                          key={game.matchId}
                          game={game}
                          playersWithHistory={
                            filteredAnalysis.seasonsData[0].players || []
                          }
                        />
                      )
                    )}
                  </div>
                </CollapsibleSection>
              )}
          </>
        )}
      </div>
    </div>
  );
}
