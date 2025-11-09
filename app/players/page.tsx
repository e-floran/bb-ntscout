/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  TableSortLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";

interface LatestScouting {
  age: number;
  salary: number;
  gs: number;
  js: number;
  jr: number;
  od: number;
  ha: number;
  dr: number;
  pa: number;
  is: number;
  id: number;
  rb: number;
  sb: number;
  st: number;
  ft: number;
  ex: number;
  scoutedAt: string;
}

interface Player {
  id: number;
  first_name: string;
  last_name: string;
  age: number;
  potential: number;
  team_id: number;
  latestScouting: LatestScouting | null;
}

interface ScoutingData {
  age: number;
  salary: number;
  gs: number;
  js: number;
  jr: number;
  od: number;
  ha: number;
  dr: number;
  pa: number;
  is: number;
  id: number;
  rb: number;
  sb: number;
  st: number;
  ft: number;
  ex: number;
  scoutedAt: string;
}

type SortField =
  | "id"
  | "last_name"
  | "first_name"
  | "age"
  | "potential"
  | "team_id"
  | "salary"
  | "gs"
  | "js"
  | "jr"
  | "od"
  | "ha"
  | "dr"
  | "pa"
  | "is"
  | "id_defense"
  | "rb"
  | "sb"
  | "st"
  | "ft"
  | "ex"
  | "scoutedAt";

type SortOrder = "asc" | "desc";

export default function PlayersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Filter states
  const [nameFilter, setNameFilter] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [minPotential, setMinPotential] = useState("");
  const [maxPotential, setMaxPotential] = useState("");

  // Sort states
  const [sortField, setSortField] = useState<SortField>("salary");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Scouting dialog states
  const [scoutingDialog, setScoutingDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [scoutingData, setScoutingData] = useState<ScoutingData>({
    age: 0,
    salary: 0,
    gs: 0,
    js: 0,
    jr: 0,
    od: 0,
    ha: 0,
    dr: 0,
    pa: 0,
    is: 0,
    id: 0,
    rb: 0,
    sb: 0,
    st: 0,
    ft: 0,
    ex: 0,
    scoutedAt: new Date().toISOString().slice(0, 16),
  });

  // Check authorization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const userProfile = await response.json();
        const allowedRoles = ["Admin", "Coach", "Scout", "Staff"];

        if (!allowedRoles.includes(userProfile.role)) {
          router.replace("/");
          return;
        }

        // Team-based access control for non-Admin users
        // Only allow access if user's main_team_id is 11 (France senior) or 1011 (France U21)
        if (userProfile.role !== "Admin") {
          const allowedTeamIds = [11, 1011];
          if (!allowedTeamIds.includes(userProfile.mainTeamId)) {
            alert(
              "Accès refusé : cette page est réservée aux équipes de France"
            );
            router.replace("/");
            return;
          }
        }

        setAuthorized(true);
      } catch (error) {
        console.error("Authorization error:", error);
        router.replace("/login");
      }
    };

    checkAuth();
  }, [router]);

  // Fetch players with filters
  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nameFilter) params.append("name", nameFilter);
      if (minAge) params.append("minAge", minAge);
      if (maxAge) params.append("maxAge", maxAge);
      if (minPotential) params.append("minPotential", minPotential);
      if (maxPotential) params.append("maxPotential", maxPotential);

      const response = await fetch(`/api/players?${params.toString()}`);

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        router.replace("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch players");
      }

      const data = await response.json();
      setPlayers(data.players || []);
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchPlayers();
    }
  }, [authorized]);

  const handleOpenScoutingDialog = async (player: Player) => {
    setSelectedPlayer(player);

    // Pre-fill with latest scouting data if available
    if (player.latestScouting) {
      setScoutingData({
        ...player.latestScouting,
        scoutedAt: new Date().toISOString().slice(0, 16),
      });
    } else {
      // Reset to defaults
      setScoutingData({
        age: player.age || 0,
        salary: 0,
        gs: 0,
        js: 0,
        jr: 0,
        od: 0,
        ha: 0,
        dr: 0,
        pa: 0,
        is: 0,
        id: 0,
        rb: 0,
        sb: 0,
        st: 0,
        ft: 0,
        ex: 0,
        scoutedAt: new Date().toISOString().slice(0, 16),
      });
    }

    setScoutingDialog(true);
  };

  const handleCloseScoutingDialog = () => {
    setScoutingDialog(false);
    setSelectedPlayer(null);
  };

  const handleInputChange = (field: keyof ScoutingData, value: string) => {
    setScoutingData((prev) => ({
      ...prev,
      [field]: field === "scoutedAt" ? value : parseFloat(value) || 0,
    }));
  };

  const handleSubmitScouting = async () => {
    if (!selectedPlayer) return;

    try {
      // This creates a NEW scouting entry (does not update existing)
      const response = await fetch("/api/scouting/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          playerData: {
            id: selectedPlayer.id,
            firstName: selectedPlayer.first_name,
            lastName: selectedPlayer.last_name,
            countryId: 11, // French players
            potential: selectedPlayer.potential,
          },
          scoutingData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Erreur lors de l'ajout au scouting");
        return;
      }

      alert("Nouveau rapport de scouting créé avec succès!");
      handleCloseScoutingDialog();
      // Refresh players list to show new scouting data
      fetchPlayers();
    } catch (error) {
      console.error("Error submitting scouting:", error);
      alert("Erreur lors de la soumission du rapport");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleSort = (field: SortField) => {
    const isAsc = sortField === field && sortOrder === "asc";
    setSortOrder(isAsc ? "desc" : "asc");
    setSortField(field);
  };

  const sortPlayers = (playersToSort: Player[]) => {
    return [...playersToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Handle nested scouting data
      if (
        [
          "salary",
          "gs",
          "js",
          "jr",
          "od",
          "ha",
          "dr",
          "pa",
          "is",
          "rb",
          "sb",
          "st",
          "ft",
          "ex",
          "scoutedAt",
        ].includes(sortField)
      ) {
        if (sortField === "id_defense") {
          aValue = a.latestScouting?.id ?? 0;
          bValue = b.latestScouting?.id ?? 0;
        } else if (sortField === "scoutedAt") {
          aValue = a.latestScouting?.scoutedAt
            ? new Date(a.latestScouting.scoutedAt).getTime()
            : 0;
          bValue = b.latestScouting?.scoutedAt
            ? new Date(b.latestScouting.scoutedAt).getTime()
            : 0;
        } else {
          aValue = a.latestScouting?.[sortField as keyof LatestScouting] ?? 0;
          bValue = b.latestScouting?.[sortField as keyof LatestScouting] ?? 0;
        }
      } else {
        aValue = a[sortField as keyof Player] ?? "";
        bValue = b[sortField as keyof Player] ?? "";
      }

      // Handle string comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle numeric comparison
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });
  };

  const sortedPlayers = sortPlayers(players);

  if (!authorized || loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, width: "100%" }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ color: "#133a8a", mb: 2, px: 1 }}
      >
        Base de données - Joueurs Français
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Filtres
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "flex-end",
          }}
        >
          <TextField
            label="Nom"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Prénom ou nom"
            size="small"
            sx={{ minWidth: "200px" }}
          />
          <TextField
            label="Âge min"
            type="number"
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
            size="small"
            sx={{ width: "100px" }}
          />
          <TextField
            label="Âge max"
            type="number"
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
            size="small"
            sx={{ width: "100px" }}
          />
          <TextField
            label="Potentiel min"
            type="number"
            value={minPotential}
            onChange={(e) => setMinPotential(e.target.value)}
            size="small"
            sx={{ width: "120px" }}
          />
          <TextField
            label="Potentiel max"
            type="number"
            value={maxPotential}
            onChange={(e) => setMaxPotential(e.target.value)}
            size="small"
            sx={{ width: "120px" }}
          />
          <Button variant="contained" onClick={fetchPlayers} size="small">
            Rechercher
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setNameFilter("");
              setMinAge("");
              setMaxAge("");
              setMinPotential("");
              setMaxPotential("");
            }}
            size="small"
          >
            Réinitialiser
          </Button>
        </Box>
      </Paper>

      {/* Players Table with Scouting Data */}
      <TableContainer
        component={Paper}
        sx={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "id"}
                  direction={sortField === "id" ? sortOrder : "asc"}
                  onClick={() => handleSort("id")}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "last_name"}
                  direction={sortField === "last_name" ? sortOrder : "asc"}
                  onClick={() => handleSort("last_name")}
                >
                  Nom
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "first_name"}
                  direction={sortField === "first_name" ? sortOrder : "asc"}
                  onClick={() => handleSort("first_name")}
                >
                  Prénom
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "age"}
                  direction={sortField === "age" ? sortOrder : "asc"}
                  onClick={() => handleSort("age")}
                >
                  Âge
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "potential"}
                  direction={sortField === "potential" ? sortOrder : "asc"}
                  onClick={() => handleSort("potential")}
                >
                  Pot.
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "team_id"}
                  direction={sortField === "team_id" ? sortOrder : "asc"}
                  onClick={() => handleSort("team_id")}
                >
                  Équipe
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "scoutedAt"}
                  direction={sortField === "scoutedAt" ? sortOrder : "asc"}
                  onClick={() => handleSort("scoutedAt")}
                >
                  Dernier scouting
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "salary"}
                  direction={sortField === "salary" ? sortOrder : "asc"}
                  onClick={() => handleSort("salary")}
                >
                  Salaire
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "gs"}
                  direction={sortField === "gs" ? sortOrder : "asc"}
                  onClick={() => handleSort("gs")}
                >
                  GS
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "js"}
                  direction={sortField === "js" ? sortOrder : "asc"}
                  onClick={() => handleSort("js")}
                >
                  JS
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "jr"}
                  direction={sortField === "jr" ? sortOrder : "asc"}
                  onClick={() => handleSort("jr")}
                >
                  JR
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "od"}
                  direction={sortField === "od" ? sortOrder : "asc"}
                  onClick={() => handleSort("od")}
                >
                  OD
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "ha"}
                  direction={sortField === "ha" ? sortOrder : "asc"}
                  onClick={() => handleSort("ha")}
                >
                  HA
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "dr"}
                  direction={sortField === "dr" ? sortOrder : "asc"}
                  onClick={() => handleSort("dr")}
                >
                  DR
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "pa"}
                  direction={sortField === "pa" ? sortOrder : "asc"}
                  onClick={() => handleSort("pa")}
                >
                  PA
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "is"}
                  direction={sortField === "is" ? sortOrder : "asc"}
                  onClick={() => handleSort("is")}
                >
                  IS
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "id_defense"}
                  direction={sortField === "id_defense" ? sortOrder : "asc"}
                  onClick={() => handleSort("id_defense")}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "rb"}
                  direction={sortField === "rb" ? sortOrder : "asc"}
                  onClick={() => handleSort("rb")}
                >
                  RB
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "sb"}
                  direction={sortField === "sb" ? sortOrder : "asc"}
                  onClick={() => handleSort("sb")}
                >
                  SB
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "st"}
                  direction={sortField === "st" ? sortOrder : "asc"}
                  onClick={() => handleSort("st")}
                >
                  ST
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "ft"}
                  direction={sortField === "ft" ? sortOrder : "asc"}
                  onClick={() => handleSort("ft")}
                >
                  FT
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                <TableSortLabel
                  active={sortField === "ex"}
                  direction={sortField === "ex" ? sortOrder : "asc"}
                  onClick={() => handleSort("ex")}
                >
                  EX
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={23} align="center">
                  Aucun joueur trouvé
                </TableCell>
              </TableRow>
            ) : (
              sortedPlayers.map((player) => (
                <TableRow key={player.id} hover>
                  <TableCell>{player.id}</TableCell>
                  <TableCell>{player.last_name}</TableCell>
                  <TableCell>{player.first_name}</TableCell>
                  <TableCell>{player.age}</TableCell>
                  <TableCell>{player.potential || "N/A"}</TableCell>
                  <TableCell>{player.team_id}</TableCell>
                  <TableCell>
                    {player.latestScouting ? (
                      <Chip
                        label={formatDate(player.latestScouting.scoutedAt)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Chip label="Aucun" size="small" color="default" />
                    )}
                  </TableCell>
                  {/* Scouting data columns */}
                  <TableCell>
                    {player.latestScouting?.salary?.toLocaleString() || "-"}
                  </TableCell>
                  <TableCell>{player.latestScouting?.gs || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.js || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.jr || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.od || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.ha || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.dr || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.pa || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.is || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.id || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.rb || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.sb || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.st || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.ft || "-"}</TableCell>
                  <TableCell>{player.latestScouting?.ex || "-"}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenScoutingDialog(player)}
                      title={
                        player.latestScouting
                          ? "Ajouter nouveau scouting"
                          : "Créer premier scouting"
                      }
                      size="small"
                    >
                      {player.latestScouting ? <EditIcon /> : <AddIcon />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography
        variant="body2"
        sx={{ mt: 1, px: 1, color: "text.secondary" }}
      >
        {players.length} joueur(s) trouvé(s)
      </Typography>

      {/* Scouting Dialog */}
      <Dialog
        open={scoutingDialog}
        onClose={handleCloseScoutingDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Nouveau rapport de scouting - {selectedPlayer?.first_name}{" "}
          {selectedPlayer?.last_name}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 2,
              mt: 2,
            }}
          >
            {Object.entries({
              age: "Âge",
              salary: "Salaire",
              gs: "GS",
              js: "JS",
              jr: "JR",
              od: "OD",
              ha: "HA",
              dr: "DR",
              pa: "PA",
              is: "IS",
              id: "ID",
              rb: "RB",
              sb: "SB",
              st: "ST",
              ft: "FT",
              ex: "EX",
            }).map(([key, label]) => (
              <TextField
                key={key}
                fullWidth
                label={label}
                type="number"
                value={scoutingData[key as keyof ScoutingData]}
                onChange={(e) =>
                  handleInputChange(key as keyof ScoutingData, e.target.value)
                }
                size="small"
              />
            ))}
            <TextField
              fullWidth
              label="Date de scouting"
              type="datetime-local"
              value={scoutingData.scoutedAt}
              onChange={(e) => handleInputChange("scoutedAt", e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ gridColumn: "1 / -1" }}
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseScoutingDialog}>Annuler</Button>
          <Button onClick={handleSubmitScouting} variant="contained">
            Créer nouveau scouting
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
