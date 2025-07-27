"use client";

import { useEffect, useState } from "react";

export default function IndexPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/analyzeTeam", {
          credentials: "include",
        });
        const data = await res.json();
        if (data.error) {
          setErr(data.error);
        } else {
          setAnalysis(data);
        }
      } catch (e: any) {
        setErr(e.message);
      }
      setLoading(false);
    })();
  }, []);

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

  if (loading) return <div>Loading team analysis...</div>;
  if (err) return <div className="form-error">{err}</div>;

  const { opponentName, opponentId, curr, prev, season, prevSeason } =
    analysis || {};

  // Build table data
  function stratRows(stratsA = {}, stratsB = {}) {
    const allKeys = Array.from(
      new Set([...Object.keys(stratsA), ...Object.keys(stratsB)])
    );
    return allKeys.map((strat) => [
      strat,
      stratsA[strat] || 0,
      stratsB[strat] || 0,
    ]);
  }
  function avgRows(avgA = {}, avgB = {}) {
    const allCats = Array.from(
      new Set([...Object.keys(avgA), ...Object.keys(avgB)])
    );
    return allCats.map((cat) => [
      cat,
      avgA[cat] !== undefined ? avgA[cat].toFixed(2) : "",
      avgB[cat] !== undefined ? avgB[cat].toFixed(2) : "",
    ]);
  }
  function effRows(effA = {}, effB = {}) {
    return ["PG", "SG", "SF", "PF", "C"].map((pos) => [
      pos,
      effA[pos] !== undefined ? effA[pos].toFixed(1) : "",
      effB[pos] !== undefined ? effB[pos].toFixed(1) : "",
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
  function effortRows(effortList = []) {
    return effortList.map((e) => [e.date, e.effortDelta.toFixed(2), e.matchId]);
  }

  return (
    <div className="main-container">
      <div
        className="form-container"
        style={{ maxWidth: "1100px", width: "100%" }}
      >
        <h2 className="form-title">Team Analysis for Next Opponent</h2>
        <div className="analysis-section">
          {opponentName ? (
            <>
              <div className="analysis-title">
                Next Opponent: {opponentName} (ID: {opponentId})
              </div>
              <div className="analysis-subtitle">
                Seasons analyzed: {season} (current), {prevSeason} (previous)
              </div>
            </>
          ) : null}
        </div>

        <div className="analysis-section">
          <div className="analysis-title">Offensive Strategies</div>
          {renderTable(
            [`Strategy`, `Count (S${season})`, `Count (S${prevSeason})`],
            stratRows(curr?.offenseStrategies, prev?.offenseStrategies)
          )}
        </div>
        <div className="analysis-section">
          <div className="analysis-title">Defensive Strategies</div>
          {renderTable(
            [`Strategy`, `Count (S${season})`, `Count (S${prevSeason})`],
            stratRows(curr?.defenseStrategies, prev?.defenseStrategies)
          )}
        </div>
        <div className="analysis-section">
          <div className="analysis-title">Average Team Ratings</div>
          {renderTable(
            [`Category`, `Average (S${season})`, `Average (S${prevSeason})`],
            avgRows(curr?.avgRatings, prev?.avgRatings)
          )}
        </div>
        <div className="analysis-section">
          <div className="analysis-title">Average Points per 100 Shots</div>
          {renderTable(
            [`Position`, `Average (S${season})`, `Average (S${prevSeason})`],
            effRows(curr?.avgEfficiency, prev?.avgEfficiency)
          )}
        </div>
        <div className="analysis-section">
          <div className="analysis-title">
            Player Stats (Averages, Current Season)
          </div>
          {renderTable(
            [
              "Player",
              "PTS",
              "AST",
              "REB",
              "BLK",
              "STL",
              "TO",
              "PF",
              "MIN",
              "Games",
            ],
            playerRows(curr?.playerSumStats)
          )}
        </div>
        <div className="analysis-section">
          <div className="analysis-title">
            EffortDelta by Game (Current Season)
          </div>
          {renderTable(
            ["Date", "EffortDelta", "MatchID"],
            effortRows(curr?.effortDeltaList)
          )}
        </div>
      </div>
    </div>
  );
}
