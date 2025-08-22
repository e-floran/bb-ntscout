/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { CollapsibleSection } from "./CollapsibleSection";
import { DataTable } from "./DataTable";
import { SectionId } from "../page";

interface ScoutedPlayersSectionProps {
  teamId: string | null;
  isCollapsed: boolean;
  onToggle: (sectionId: SectionId) => void;
  sortConfig: {
    table: string;
    column: number;
    direction: "asc" | "desc";
  } | null;
  onSort: (tableId: string, columnIndex: number) => void;
}

export function ScoutedPlayersSection({
  teamId,
  isCollapsed,
  onToggle,
  sortConfig,
  onSort,
}: ScoutedPlayersSectionProps) {
  const [scoutedPlayersData, setScoutedPlayersData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load scouted players data when teamId changes
  useEffect(() => {
    if (teamId) {
      loadScoutedPlayers(teamId);
    }
  }, [teamId]);

  const loadScoutedPlayers = async (teamId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/scoutedPlayers?teamId=${teamId}`);
      if (response.ok) {
        const data = await response.json();
        setScoutedPlayersData(data.players || []);
      } else {
        console.error("Failed to load scouted players");
        setScoutedPlayersData([]);
      }
    } catch (error) {
      console.error("Error loading scouted players:", error);
      setScoutedPlayersData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CollapsibleSection
      sectionId="scouted-players"
      title={`Joueurs scoutés éligibles (${scoutedPlayersData.length} joueurs)`}
      isCollapsed={isCollapsed}
      showSkeletons={loading}
      onToggle={() => onToggle("scouted-players")}
    >
      {scoutedPlayersData.length > 0 ? (
        <DataTable
          headers={[
            "Joueur",
            "Âge",
            "Salaire",
            "TC",
            "TCE",
            "TCI",
            "GS",
            "JS",
            "JR",
            "OD",
            "HA",
            "DR",
            "PA",
            "IS",
            "ID",
            "RB",
            "SB",
            "ST",
            "FT",
            "EX",
            "POT",
            "Scouté le",
            "NT",
          ]}
          rows={scoutedPlayersData}
          tableId="scouted-players"
          sortConfig={sortConfig}
          onSort={onSort}
          rowClassName={(rowIndex: number) => {
            // Check if this player has played for NT (last column)
            const hasPlayedForNT = scoutedPlayersData[rowIndex]?.[22] === "Oui";
            return hasPlayedForNT ? "nt-player-row" : "";
          }}
        />
      ) : (
        <p>Aucun joueur scouté éligible trouvé pour cette équipe nationale.</p>
      )}
    </CollapsibleSection>
  );
}
