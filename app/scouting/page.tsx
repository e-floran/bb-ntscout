"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/app/components/common/LoadingState";
import { RedirectingState } from "@/app/components/common/RedirectingState";

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

interface PlayerData {
  id: number;
  firstName: string;
  lastName: string;
  countryId: number;
  potential: number;
  latestScouting?: ScoutingData;
}

interface NewPlayerData {
  firstName: string;
  lastName: string;
  countryId: number;
  potential: number;
}

interface BatchResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function ScoutingPage() {
  const [playerId, setPlayerId] = useState("");
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [showScoutingForm, setShowScoutingForm] = useState(false);
  const [isNewPlayer, setIsNewPlayer] = useState(false);
  const [newPlayerData, setNewPlayerData] = useState<NewPlayerData>({
    firstName: "",
    lastName: "",
    countryId: 0,
    potential: 0,
  });
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
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Check user authorization on mount
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const authenticatedUser = document.cookie
          .split("; ")
          .find((row) => row.startsWith("authenticated_user="))
          ?.split("=")[1];

        if (!authenticatedUser) {
          router.push("/login");
          return;
        }

        // Fetch user profile to check role
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const userProfile = await response.json();

          // Check if user has permission for scouting page (Admin, Coach, Staff, Scout)
          const allowedRoles = ["Admin", "Coach", "Staff", "Scout"];
          if (allowedRoles.includes(userProfile.role)) {
            setIsAuthorized(true);
          } else {
            // User is authenticated but doesn't have permission, redirect to index
            router.push("/");
          }
        } else {
          // If profile fetch fails, redirect to login
          router.push("/login");
        }
      } catch (error) {
        console.error("Error checking authorization:", error);
        router.push("/login");
      }
    };

    checkAuthorization();
  }, [router]);

  const handlePlayerLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId) return;

    try {
      const response = await fetch(`/api/scouting/player/${playerId}`);
      if (response.ok) {
        const data = await response.json();
        setPlayerData(data);

        // Check if this is a new player (no firstName means new)
        const isNew = !data.firstName;
        setIsNewPlayer(isNew);

        if (isNew) {
          // Reset new player form
          setNewPlayerData({
            firstName: "",
            lastName: "",
            countryId: 0,
            potential: 0,
          });
        }

        // If player exists and has scouting data, populate form with latest scouting data
        if (data.latestScouting) {
          setScoutingData({
            ...data.latestScouting,
            scoutedAt: new Date().toISOString().slice(0, 16),
          });
        } else {
          // Reset form for new player or player without scouting data
          setScoutingData({
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
        }
        setShowScoutingForm(true);
      } else {
        alert("Erreur lors de la recherche du joueur");
      }
    } catch (error) {
      console.error("Error looking up player:", error);
      alert("Erreur lors de la recherche du joueur");
    }
  };

  const handleScoutingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use new player data if this is a new player, otherwise use existing player data
    const submitPlayerData = isNewPlayer
      ? {
          id: parseInt(playerId),
          ...newPlayerData,
        }
      : playerData;

    try {
      const response = await fetch("/api/scouting/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: parseInt(playerId),
          playerData: submitPlayerData,
          scoutingData,
        }),
      });

      if (response.ok) {
        alert("Rapport de scouting sauvegardé avec succès !");
        // Reset form
        setPlayerId("");
        setPlayerData(null);
        setShowScoutingForm(false);
        setIsNewPlayer(false);
        setNewPlayerData({
          firstName: "",
          lastName: "",
          countryId: 0,
          potential: 0,
        });
      } else {
        alert("Erreur lors de la sauvegarde du rapport");
      }
    } catch (error) {
      console.error("Error submitting scouting:", error);
      alert("Erreur lors de la soumission du rapport");
    }
  };

  const handleInputChange = (field: keyof ScoutingData, value: string) => {
    setScoutingData((prev) => ({
      ...prev,
      [field]: field === "scoutedAt" ? value : parseFloat(value) || 0,
    }));
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) return;

    try {
      const response = await fetch("/api/scouting/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchText: batchText.trim(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setBatchResult(result);
        setBatchText("");
      } else {
        alert("Erreur lors du traitement par copié/collé");
      }
    } catch (error) {
      console.error("Error submitting batch:", error);
      alert("Erreur lors de la soumission par copié/collé");
    }
  };

  if (isAuthorized === null) {
    return <LoadingState message="Vérification des autorisations..." />;
  }

  if (isAuthorized === false) {
    return (
      <RedirectingState
        message="Accès refusé"
        reason="Vous n'avez pas l'autorisation d'accéder à la page de scouting. Redirection vers l'accueil..."
      />
    );
  }

  return (
    <div className="main-container">
      <div
        className="form-container"
        style={{ maxWidth: "1200px", width: "100%" }}
      >
        <h2 className="form-title">Scouting Manuel</h2>

        {!showScoutingForm && !showBatchForm ? (
          <div
            style={{
              background: "#fff",
              padding: "2rem",
              borderRadius: "12px",
              boxShadow: "0 4px 24px rgba(60, 84, 137, 0.1)",
              textAlign: "center",
            }}
          >
            <h3 className="analysis-title" style={{ marginBottom: "1.5rem" }}>
              Rechercher un joueur
            </h3>
            <form
              onSubmit={handlePlayerLookup}
              className="analysis-form"
              style={{
                justifyContent: "center",
                maxWidth: "400px",
                margin: "0 auto",
              }}
            >
              <label className="analysis-form-label">
                ID du joueur :
                <input
                  type="number"
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  placeholder="Ex: 12345678"
                  className="analysis-form-input"
                  style={{ width: "120px", marginLeft: "0.5rem" }}
                  required
                />
              </label>
              <button type="submit" className="analysis-form-submit">
                Rechercher
              </button>
            </form>
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setShowBatchForm(true)}
                style={{
                  padding: "0.75rem 2rem",
                  background:
                    "linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Scouting par copié/collé
              </button>
            </div>
          </div>
        ) : showBatchForm ? (
          <div className="analysis-section">
            <h3 className="analysis-title">Scouting par copié/collé</h3>
            <div
              style={{
                background: "#fff",
                padding: "2rem",
                borderRadius: "12px",
                boxShadow: "0 4px 24px rgba(60, 84, 137, 0.1)",
              }}
            >
              <form onSubmit={handleBatchSubmit}>
                <div style={{ marginBottom: "1.5rem" }}>
                  <label className="form-label">
                    Coller les profils des joueurs (sur Firefox uniquement pour
                    l&apos;instant) :
                  </label>
                  <textarea
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    className="form-input"
                    style={{ minHeight: "300px", fontFamily: "monospace" }}
                    placeholder="Coller ici les profils des joueurs depuis le jeu..."
                    required
                  />
                </div>

                {batchResult && (
                  <div
                    style={{
                      marginBottom: "1.5rem",
                      padding: "1rem",
                      background:
                        batchResult.failed > 0 ? "#fef3c7" : "#d1fae5",
                      border: `1px solid ${
                        batchResult.failed > 0 ? "#f59e0b" : "#10b981"
                      }`,
                      borderRadius: "8px",
                    }}
                  >
                    <h4>Résultats du traitement :</h4>
                    <p>
                      ✅ Succès: {batchResult.success} joueur(s)
                      {batchResult.failed > 0 && (
                        <>
                          <br />❌ Échecs: {batchResult.failed} joueur(s)
                        </>
                      )}
                    </p>
                    {batchResult.errors.length > 0 && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <strong>Erreurs :</strong>
                        <ul
                          style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}
                        >
                          {batchResult.errors.map((error, index) => (
                            <li key={index} style={{ fontSize: "0.9rem" }}>
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    justifyContent: "center",
                  }}
                >
                  <button
                    type="submit"
                    className="form-submit"
                    style={{ width: "auto", padding: "0.75rem 2rem" }}
                  >
                    Traiter par copié/collé
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBatchForm(false);
                      setBatchText("");
                      setBatchResult(null);
                    }}
                    style={{
                      padding: "0.75rem 2rem",
                      background:
                        "linear-gradient(90deg, #6b7280 0%, #9ca3af 100%)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="analysis-section">
            <h3 className="analysis-title">
              Rapport de scouting pour{" "}
              {isNewPlayer
                ? "Nouveau joueur"
                : `${playerData?.firstName} ${playerData?.lastName}`}{" "}
              (ID: {playerId})
            </h3>

            {isNewPlayer && (
              <div
                style={{
                  marginBottom: "2rem",
                  padding: "1.5rem",
                  background: "#fff3cd",
                  border: "1px solid #ffeaa7",
                  borderRadius: "8px",
                }}
              >
                <h4 className="analysis-subtitle">Informations du joueur</h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label className="form-label">Prénom</label>
                    <input
                      type="text"
                      value={newPlayerData.firstName}
                      onChange={(e) =>
                        setNewPlayerData((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Nom</label>
                    <input
                      type="text"
                      value={newPlayerData.lastName}
                      onChange={(e) =>
                        setNewPlayerData((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">ID Pays</label>
                    <input
                      type="number"
                      value={newPlayerData.countryId}
                      onChange={(e) =>
                        setNewPlayerData((prev) => ({
                          ...prev,
                          countryId: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Potentiel</label>
                    <input
                      type="number"
                      value={newPlayerData.potential}
                      onChange={(e) =>
                        setNewPlayerData((prev) => ({
                          ...prev,
                          potential: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="form-input"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                background: "#fff",
                padding: "2rem",
                borderRadius: "12px",
                boxShadow: "0 4px 24px rgba(60, 84, 137, 0.1)",
              }}
            >
              <h4 className="analysis-subtitle">Données de scouting</h4>
              <form onSubmit={handleScoutingSubmit}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "1rem",
                    marginBottom: "2rem",
                  }}
                >
                  <div>
                    <label className="form-label">Âge</label>
                    <input
                      type="number"
                      value={scoutingData.age}
                      onChange={(e) => handleInputChange("age", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Salaire</label>
                    <input
                      type="number"
                      value={scoutingData.salary}
                      onChange={(e) =>
                        handleInputChange("salary", e.target.value)
                      }
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">GS</label>
                    <input
                      type="number"
                      value={scoutingData.gs}
                      onChange={(e) => handleInputChange("gs", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">JS</label>
                    <input
                      type="number"
                      value={scoutingData.js}
                      onChange={(e) => handleInputChange("js", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">JR</label>
                    <input
                      type="number"
                      value={scoutingData.jr}
                      onChange={(e) => handleInputChange("jr", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">OD</label>
                    <input
                      type="number"
                      value={scoutingData.od}
                      onChange={(e) => handleInputChange("od", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">HA</label>
                    <input
                      type="number"
                      value={scoutingData.ha}
                      onChange={(e) => handleInputChange("ha", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">DR</label>
                    <input
                      type="number"
                      value={scoutingData.dr}
                      onChange={(e) => handleInputChange("dr", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">PA</label>
                    <input
                      type="number"
                      value={scoutingData.pa}
                      onChange={(e) => handleInputChange("pa", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">IS</label>
                    <input
                      type="number"
                      value={scoutingData.is}
                      onChange={(e) => handleInputChange("is", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">ID</label>
                    <input
                      type="number"
                      value={scoutingData.id}
                      onChange={(e) => handleInputChange("id", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">RB</label>
                    <input
                      type="number"
                      value={scoutingData.rb}
                      onChange={(e) => handleInputChange("rb", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">SB</label>
                    <input
                      type="number"
                      value={scoutingData.sb}
                      onChange={(e) => handleInputChange("sb", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">ST</label>
                    <input
                      type="number"
                      value={scoutingData.st}
                      onChange={(e) => handleInputChange("st", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">FT</label>
                    <input
                      type="number"
                      value={scoutingData.ft}
                      onChange={(e) => handleInputChange("ft", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">EX</label>
                    <input
                      type="number"
                      value={scoutingData.ex}
                      onChange={(e) => handleInputChange("ex", e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <label className="form-label">Date de scouting</label>
                    <input
                      type="datetime-local"
                      value={scoutingData.scoutedAt}
                      onChange={(e) =>
                        handleInputChange("scoutedAt", e.target.value)
                      }
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    justifyContent: "center",
                  }}
                >
                  <button
                    type="submit"
                    className="form-submit"
                    style={{
                      width: "auto",
                      padding: "0.75rem 2rem",
                      background:
                        "linear-gradient(90deg, #059669 0%, #10b981 100%)",
                    }}
                  >
                    Sauvegarder le rapport
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowScoutingForm(false);
                      setPlayerId("");
                      setPlayerData(null);
                      setIsNewPlayer(false);
                      setNewPlayerData({
                        firstName: "",
                        lastName: "",
                        countryId: 0,
                        potential: 0,
                      });
                    }}
                    style={{
                      padding: "0.75rem 2rem",
                      background:
                        "linear-gradient(90deg, #6b7280 0%, #9ca3af 100%)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
