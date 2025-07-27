import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { baseApiUrl } from "@/app/utils/api/apiUtils";
import { users } from "@/app/utils/users";
import xml2js from "xml2js";

const TEAM_DATA_DIR = path.join(process.cwd(), "app/data/teams");
const SEASON = 69;
const PREV_SEASON = SEASON - 1;

function parseDate(dateString: string) {
  return new Date(dateString);
}

async function fetchXml(url: string, cookies: string) {
  const response = await fetch(url, {
    headers: cookies ? { Cookie: cookies } : undefined,
  });
  const text = await response.text();
  const parser = new xml2js.Parser({ explicitArray: false });
  return parser.parseStringPromise(text);
}

export async function GET(req: NextRequest) {
  // Get user from cookie
  const login = req.cookies.get("authenticated_user")?.value;
  if (!login) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  // Find user object
  const user = users.find((u) => u.login === login && u.active);
  if (!user) {
    return NextResponse.json(
      { error: "User not found or not active" },
      { status: 401 }
    );
  }
  const mainTeamId = user.mainTeamId;

  // Ensure JSON file exists for team
  const jsonPath = path.join(TEAM_DATA_DIR, `${mainTeamId}.json`);
  // Defensive: create directory if missing
  if (!fs.existsSync(TEAM_DATA_DIR)) {
    fs.mkdirSync(TEAM_DATA_DIR, { recursive: true });
  }

  // Get BBAPI session cookie for requests
  const bbSession = req.cookies.get("bbapi_session")?.value || "";

  // Fetch team schedule for this season
  const teamScheduleUrl = `${baseApiUrl}schedule.aspx?teamid=${mainTeamId}&season=${SEASON}`;
  const teamScheduleXml = await fetchXml(teamScheduleUrl, bbSession);

  // Debug output: see what the BBAPI returns
  // console.log(JSON.stringify(teamScheduleXml, null, 2));

  let matches = [];
  if (teamScheduleXml?.bbapi?.schedule?.match) {
    matches = teamScheduleXml.bbapi.schedule.match;
    if (!Array.isArray(matches)) matches = [matches];
  } else {
    // API error or empty schedule
    return NextResponse.json({
      error: "Team schedule not found or API error",
      details: teamScheduleXml,
    });
  }

  // Get unique player IDs for season
  const playerSet = new Set<number>();
  for (const m of matches) {
    if (
      m.homeTeam &&
      m.homeTeam.$.id == mainTeamId &&
      m.homeTeam.boxscore?.player
    ) {
      const players = Array.isArray(m.homeTeam.boxscore.player)
        ? m.homeTeam.boxscore.player
        : [m.homeTeam.boxscore.player];
      players.forEach((p: any) => playerSet.add(Number(p.$.id)));
    }
    if (
      m.awayTeam &&
      m.awayTeam.$.id == mainTeamId &&
      m.awayTeam.boxscore?.player
    ) {
      const players = Array.isArray(m.awayTeam.boxscore.player)
        ? m.awayTeam.boxscore.player
        : [m.awayTeam.boxscore.player];
      players.forEach((p: any) => playerSet.add(Number(p.$.id)));
    }
  }
  // If file does not exist, create as per example.json format
  if (!fs.existsSync(jsonPath)) {
    const jsonTeam = {
      id: Number(mainTeamId),
      players: Array.from(playerSet),
      isJunior: Number(mainTeamId) > 1000,
      continent: null,
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonTeam, null, 2));
  }

  // Find next future match
  const now = new Date();
  const futureMatches = matches.filter(
    (m: any) => parseDate(m["$"].start) > now
  );

  if (futureMatches.length === 0) {
    return NextResponse.json({ error: "No future matches set for your team" });
  }
  const nextMatch = futureMatches.sort(
    (a: any, b: any) => parseDate(a["$"].start) - parseDate(b["$"].start)
  )[0];

  let opponentTeam;
  if (nextMatch.homeTeam["$"].id == mainTeamId) {
    opponentTeam = nextMatch.awayTeam;
  } else {
    opponentTeam = nextMatch.homeTeam;
  }
  const opponentId = opponentTeam["$"].id;
  const opponentName = opponentTeam.teamName;

  // Function to analyze opponent as in analyze.js
  async function analyzeOpponentSeason(
    opponentId: string,
    cookies: string,
    season: number
  ) {
    const opponentScheduleUrl = `${baseApiUrl}schedule.aspx?teamid=${opponentId}&season=${season}`;
    const opponentScheduleXml = await fetchXml(opponentScheduleUrl, cookies);

    let opponentMatches = [];
    if (opponentScheduleXml?.bbapi?.schedule?.match) {
      opponentMatches = opponentScheduleXml.bbapi.schedule.match;
      if (!Array.isArray(opponentMatches)) opponentMatches = [opponentMatches];
    } else {
      // No matches for opponent, return empty analysis
      return {
        offenseStrategies: {},
        defenseStrategies: {},
        avgRatings: {},
        avgEfficiency: {},
        effortDeltaList: [],
        playerSumStats: {},
      };
    }

    let offenseStrategies: Record<string, number> = {};
    let defenseStrategies: Record<string, number> = {};
    let ratingsTotal: Record<string, number> = {};
    let ratingsCount = 0;
    let effTotal = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 },
      effCount = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
    let playerSumStats: Record<string, any> = {};
    let effortDeltaList: any[] = [];

    for (const match of opponentMatches) {
      const matchId = match["$"].id;
      const matchDateStr = match["$"].start;
      const matchDate = parseDate(matchDateStr);
      if (season === SEASON && matchDate >= now) continue;

      const boxscoreUrl = `${baseApiUrl}boxscore.aspx?matchid=${matchId}`;
      let boxXml;
      try {
        boxXml = await fetchXml(boxscoreUrl, cookies);
      } catch (e) {
        continue;
      }

      const matchNode = boxXml?.bbapi?.match;
      let teamNode = null;
      if (
        matchNode?.awayTeam &&
        matchNode.awayTeam.$ &&
        matchNode.awayTeam.$.id == opponentId
      )
        teamNode = matchNode.awayTeam;
      else if (
        matchNode?.homeTeam &&
        matchNode.homeTeam.$ &&
        matchNode.homeTeam.$.id == opponentId
      )
        teamNode = matchNode.homeTeam;
      else continue;

      const offStrat = (teamNode.offStrategy || "").trim();
      const defStrat = (teamNode.defStrategy || "").trim();
      offenseStrategies[offStrat] = (offenseStrategies[offStrat] || 0) + 1;
      defenseStrategies[defStrat] = (defenseStrategies[defStrat] || 0) + 1;

      if (teamNode.ratings) {
        for (const [cat, value] of Object.entries(teamNode.ratings)) {
          ratingsTotal[cat] =
            (ratingsTotal[cat] || 0) + parseFloat(value as string);
        }
        ratingsCount++;
      }

      if (teamNode.efficiency) {
        for (const pos of ["PG", "SG", "SF", "PF", "C"]) {
          if (teamNode.efficiency[pos] !== undefined) {
            effTotal[pos] += parseFloat(teamNode.efficiency[pos]);
            effCount[pos]++;
          }
        }
      }

      if (
        "effortDelta" in matchNode &&
        !isNaN(parseFloat(matchNode.effortDelta))
      ) {
        effortDeltaList.push({
          date: matchDateStr,
          effortDelta: parseFloat(matchNode.effortDelta),
          matchId: matchId,
        });
      }

      if (teamNode.boxscore && teamNode.boxscore.player) {
        let players = teamNode.boxscore.player;
        if (!Array.isArray(players)) players = [players];
        for (const p of players) {
          const pid = p["$"].id;
          const name = `${p.firstName} ${p.lastName}`;
          if (!playerSumStats[pid]) {
            playerSumStats[pid] = {
              name,
              pts: 0,
              ast: 0,
              reb: 0,
              min: 0,
              games: 0,
              blk: 0,
              stl: 0,
              to: 0,
              pf: 0,
            };
          }
          if (
            p.performance &&
            p.performance.pts !== undefined &&
            p.performance.pts !== "N/A"
          ) {
            playerSumStats[pid].pts += parseInt(p.performance.pts);
            playerSumStats[pid].ast += parseInt(p.performance.ast);
            playerSumStats[pid].reb += parseInt(p.performance.reb);
            playerSumStats[pid].blk += parseInt(p.performance.blk);
            playerSumStats[pid].stl += parseInt(p.performance.stl);
            playerSumStats[pid].to += parseInt(p.performance.to);
            playerSumStats[pid].pf += parseInt(p.performance.pf);
            let min = 0;
            for (const pos of ["PG", "SG", "SF", "PF", "C"]) {
              if (p.minutes && p.minutes[pos]) min += parseInt(p.minutes[pos]);
            }
            playerSumStats[pid].min += min;
            playerSumStats[pid].games += 1;
          }
        }
      }
    }

    effortDeltaList.sort((a, b) => parseDate(a.date) - parseDate(b.date));

    const avgRatings: Record<string, number> = {};
    for (const [cat, sum] of Object.entries(ratingsTotal)) {
      avgRatings[cat] = ratingsCount ? sum / ratingsCount : 0;
    }
    const avgEfficiency: Record<string, number> = {};
    for (const pos of ["PG", "SG", "SF", "PF", "C"]) {
      avgEfficiency[pos] = effCount[pos] ? effTotal[pos] / effCount[pos] : 0;
    }

    return {
      offenseStrategies,
      defenseStrategies,
      avgRatings,
      avgEfficiency,
      effortDeltaList,
      playerSumStats,
    };
  }

  // Run analysis for opponent, current and previous season
  const [curr, prev] = await Promise.all([
    analyzeOpponentSeason(opponentId, bbSession, SEASON),
    analyzeOpponentSeason(opponentId, bbSession, PREV_SEASON),
  ]);

  return NextResponse.json({
    opponentName,
    opponentId,
    curr,
    prev,
    season: SEASON,
    prevSeason: PREV_SEASON,
  });
}
