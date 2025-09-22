"use client";

import { useState } from "react";

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
        alert("Error occurred while looking up player");
      }
    } catch (error) {
      console.error("Error looking up player:", error);
      alert("Error looking up player");
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
        alert("Scouting report saved successfully!");
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
        alert("Error saving scouting report");
      }
    } catch (error) {
      console.error("Error submitting scouting:", error);
      alert("Error submitting scouting report");
    }
  };

  const handleInputChange = (field: keyof ScoutingData, value: string) => {
    setScoutingData((prev) => ({
      ...prev,
      [field]: field === "scoutedAt" ? value : parseFloat(value) || 0,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Player Scouting</h1>

        {!showScoutingForm ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Enter Player ID</h2>
            <form onSubmit={handlePlayerLookup} className="flex gap-4">
              <input
                type="number"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="Player ID"
                className="border rounded px-3 py-2 flex-1"
                required
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Look Up Player
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              Scouting Report for{" "}
              {isNewPlayer
                ? "New Player"
                : `${playerData?.firstName} ${playerData?.lastName}`}{" "}
              (ID: {playerId})
            </h2>

            {isNewPlayer && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-lg font-medium mb-3">Player Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={newPlayerData.firstName}
                      onChange={(e) =>
                        setNewPlayerData((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                      className="border rounded px-3 py-2 w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={newPlayerData.lastName}
                      onChange={(e) =>
                        setNewPlayerData((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                      className="border rounded px-3 py-2 w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Country ID
                    </label>
                    <input
                      type="number"
                      value={newPlayerData.countryId}
                      onChange={(e) =>
                        setNewPlayerData((prev) => ({
                          ...prev,
                          countryId: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="border rounded px-3 py-2 w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Potential
                    </label>
                    <input
                      type="number"
                      value={newPlayerData.potential}
                      onChange={(e) =>
                        setNewPlayerData((prev) => ({
                          ...prev,
                          potential: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="border rounded px-3 py-2 w-full"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <form
              onSubmit={handleScoutingSubmit}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Age</label>
                <input
                  type="number"
                  value={scoutingData.age}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Salary</label>
                <input
                  type="number"
                  value={scoutingData.salary}
                  onChange={(e) => handleInputChange("salary", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">GS</label>
                <input
                  type="number"
                  value={scoutingData.gs}
                  onChange={(e) => handleInputChange("gs", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">JS</label>
                <input
                  type="number"
                  value={scoutingData.js}
                  onChange={(e) => handleInputChange("js", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">JR</label>
                <input
                  type="number"
                  value={scoutingData.jr}
                  onChange={(e) => handleInputChange("jr", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">OD</label>
                <input
                  type="number"
                  value={scoutingData.od}
                  onChange={(e) => handleInputChange("od", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">HA</label>
                <input
                  type="number"
                  value={scoutingData.ha}
                  onChange={(e) => handleInputChange("ha", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">DR</label>
                <input
                  type="number"
                  value={scoutingData.dr}
                  onChange={(e) => handleInputChange("dr", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">PA</label>
                <input
                  type="number"
                  value={scoutingData.pa}
                  onChange={(e) => handleInputChange("pa", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">IS</label>
                <input
                  type="number"
                  value={scoutingData.is}
                  onChange={(e) => handleInputChange("is", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ID</label>
                <input
                  type="number"
                  value={scoutingData.id}
                  onChange={(e) => handleInputChange("id", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">RB</label>
                <input
                  type="number"
                  value={scoutingData.rb}
                  onChange={(e) => handleInputChange("rb", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">SB</label>
                <input
                  type="number"
                  value={scoutingData.sb}
                  onChange={(e) => handleInputChange("sb", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ST</label>
                <input
                  type="number"
                  value={scoutingData.st}
                  onChange={(e) => handleInputChange("st", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">FT</label>
                <input
                  type="number"
                  value={scoutingData.ft}
                  onChange={(e) => handleInputChange("ft", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">EX</label>
                <input
                  type="number"
                  value={scoutingData.ex}
                  onChange={(e) => handleInputChange("ex", e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Scouted At
                </label>
                <input
                  type="datetime-local"
                  value={scoutingData.scoutedAt}
                  onChange={(e) =>
                    handleInputChange("scoutedAt", e.target.value)
                  }
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>

              <div className="col-span-2 md:col-span-4 flex gap-4 mt-4">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  Save Scouting Report
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
                  className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
