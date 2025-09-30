import { NextRequest, NextResponse } from "next/server";

// Mapping tables
const POTENTIAL_MAPPING: Record<string, number> = {
  "Eplucheur d'oranges": 0,
  "Cireur de banc": 1,
  Remplaçant: 2,
  "Sixième homme": 3,
  Titulaire: 4,
  Star: 5,
  "All-Star": 6,
  "Franchise Player": 7,
  "Star planétaire": 8,
  MVP: 9,
  "Hall of Famer": 10,
  Légende: 11,
};

const STAT_LEVELS: Record<string, number> = {
  atroce: 1,
  pitoyable: 2,
  horrible: 3,
  mauvais: 4,
  médiocre: 5,
  moyen: 6,
  respectable: 7,
  fort: 8,
  compétent: 9,
  proéminent: 10,
  prolifique: 11,
  sensationnel: 12,
  énorme: 13,
  merveilleux: 14,
  magnifique: 15,
  prodigieux: 16,
  stupéfiant: 17,
  phénoménal: 18,
  colossal: 19,
  légendaire: 20,
};

const COUNTRIES: Record<string, number> = {
  USA: 1,
  Argentina: 2,
  Brasil: 3,
  Canada: 4,
  China: 5,
  Türkiye: 6,
  España: 7,
  Deutschland: 8,
  Sverige: 9,
  Italia: 10,
  France: 11,
  Hellas: 12,
  Belgium: 13,
  England: 14,
  Israel: 15,
  Nederland: 16,
  Australia: 17,
  Portugal: 18,
  Rossiya: 19,
  Lietuva: 20,
  Chile: 21,
  Colombia: 22,
  Hanguk: 23,
  Hrvatska: 24,
  Nigeria: 25,
  Norge: 26,
  Österreich: 27,
  Schweiz: 28,
  Srbija: 29,
  México: 30,
  "Al Jazair": 31,
  "Al Maghrib": 32,
  Ukraina: 33,
  Bolivia: 34,
  "Bosna i Hercegovina": 35,
  Bulgaria: 36,
  "Česká Rep.": 37,
  "Costa Rica": 38,
  Danmark: 39,
  Ecuador: 40,
  Eesti: 41,
  India: 42,
  Indonesia: 43,
  Ireland: 44,
  "Hong Kong": 45,
  Latvija: 46,
  Lubnan: 47,
  Magyarország: 48,
  Makedonija: 49,
  Malaysia: 50,
  Misr: 51,
  "New Zealand": 52,
  Nippon: 53,
  Panama: 54,
  Paraguay: 55,
  Perú: 56,
  Pilipinas: 57,
  Polska: 58,
  Iran: 59,
  "Rep. Dominicana": 60,
  România: 61,
  Sakartvelo: 62,
  "Saudi Arabia": 63,
  Scotland: 64,
  Singapore: 65,
  Slovenija: 66,
  Slovensko: 67,
  "South Africa": 68,
  Suomi: 69,
  Taiwan: 70,
  Tounes: 71,
  "Prathet Thai": 72,
  Uruguay: 73,
  Venezuela: 74,
  Andorra: 75,
  "Crna Gora": 76,
  Cyprus: 77,
  Ísland: 78,
  Shqipëria: 79,
  "Puerto Rico": 80,
  Cymru: 81,
  Guatemala: 82,
  Kazakhstan: 83,
  "U.A.E.": 84,
  Belarus: 85,
  Moldova: 86,
  Hayastan: 87,
  Azərbaycan: 88,
  Pakistan: 89,
  Malta: 90,
  Luxembourg: 91,
  "Việt Nam": 92,
  Ghana: 93,
  Senegal: 94,
  Barbados: 95,
  Jamaica: 96,
  Macau: 97,
  Bahamas: 98,
  Utopia: 99,
};

interface ParsedPlayer {
  id: number;
  firstName: string;
  lastName: string;
  countryId: number;
  potential: number;
  age: number;
  salary: number;
  stats: {
    gs: number; // gameshape
    js: number; // jump shot
    jr: number; // jump range
    od: number; // outside defense
    ha: number; // handling
    dr: number; // driving
    pa: number; // passing
    is: number; // inside shot
    id: number; // inside defense
    rb: number; // rebounding
    sb: number; // shot blocking
    st: number; // stamina
    ft: number; // free throw
    ex: number; // experience
  };
}

function parseStatValue(text: string): number {
  // Clean up the text - remove arrows and extra whitespace
  const cleanText = text.replace(/[↑↓]/g, "").trim();

  // Check if it's "légendaire" with number in parentheses
  const legendaireMatch = cleanText.match(/légendaire\s*\((\d+)\)/i);
  if (legendaireMatch) {
    return parseInt(legendaireMatch[1]);
  }

  // Extract just the stat word (first word before any spaces or special characters)
  const statWord = cleanText.split(/[\s\t\(]/)[0].toLowerCase();

  // Check for other stat levels
  const statLevel = STAT_LEVELS[statWord];
  if (statLevel) {
    return statLevel;
  }

  // If it's just a number in parentheses
  const numberMatch = cleanText.match(/\((\d+)\)/);
  if (numberMatch) {
    return parseInt(numberMatch[1]);
  }

  return 0;
}
function parsePlayer(playerText: string): ParsedPlayer {
  const lines = playerText
    .trim()
    .split("\n")
    .map((line) => line.trim());

  // Extract country from first line [Country] - handle multiple countries by taking the first one
  const countryMatches = lines[0].match(/\[([^\]]+)\]/g);
  if (!countryMatches) {
    throw new Error("Pays non trouvé");
  }

  const firstCountryMatch = countryMatches[0].match(/\[([^\]]+)\]/);
  if (!firstCountryMatch) throw new Error("Pays non trouvé");

  const countryName = firstCountryMatch[1];
  const countryId = COUNTRIES[countryName];
  if (!countryId) throw new Error(`Pays non reconnu: ${countryName}`);

  // Find player name and ID line
  let playerLine = "";
  for (const line of lines) {
    if (line.includes("(") && line.match(/\(\d+\)/)) {
      playerLine = line;
      break;
    }
  }

  if (!playerLine) throw new Error("Ligne du joueur non trouvée");

  // Extract name and ID - handle nicknames in quotes
  const nameMatch = playerLine.match(/^([^(]+?)\s*\((\d+)\)/);
  if (!nameMatch) throw new Error("Nom ou ID du joueur non trouvé");

  let fullName = nameMatch[1].trim();
  const playerId = parseInt(nameMatch[2]);

  // Remove nickname in quotes if present
  fullName = fullName
    .replace(/"[^"]*"/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const [firstName, ...lastNameParts] = fullName.split(" ");
  const lastName = lastNameParts.join(" ");

  // Extract salary
  const salaryLine = lines.find((line) => line.includes("Salaire:"));
  const salaryMatch = salaryLine?.match(/Salaire:\s*\$\s*([\d\s,]+)/);
  const salary = salaryMatch
    ? parseInt(salaryMatch[1].replace(/[\s,]/g, ""))
    : 0;

  // Extract age
  const ageLine = lines.find((line) => line.includes("Age:"));
  const ageMatch = ageLine?.match(/Age:\s*(\d+)/);
  const age = ageMatch ? parseInt(ageMatch[1]) : 0;

  // Extract potential
  const potentialLine = lines.find((line) => line.includes("Potentiel:"));
  const potentialMatch = potentialLine?.match(/Potentiel:\s*(.+)/);
  const potentialText = potentialMatch?.[1]?.trim();
  const potential = potentialText ? POTENTIAL_MAPPING[potentialText] ?? 0 : 0;

  // Extract gameshape
  const gameshapeLine = lines.find((line) =>
    line.includes("Forme cette semaine:")
  );
  const gameshapeMatch = gameshapeLine?.match(/Forme cette semaine:\s*(.+)/);
  const gameshapeText = gameshapeMatch?.[1]?.trim();
  const gs = gameshapeText ? parseStatValue(gameshapeText) : 0;

  // Extract stats - look for the stats section
  const stats = {
    gs,
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
  };

  // Parse stats from the text - they can be on same line separated by tabs
  const fullText = lines.join(" ");

  // Parse each stat using regex that stops at tab or next stat name
  const jumpShotMatch = fullText.match(
    /Jump shot:\s*([^:\t]+?)(?=\s*(?:Portée|$))/
  );
  if (jumpShotMatch) stats.js = parseStatValue(jumpShotMatch[1].trim());

  const jumpRangeMatch = fullText.match(
    /Portée shoot:\s*([^:\t]+?)(?=\s*(?:Déf\.|$))/
  );
  if (jumpRangeMatch) stats.jr = parseStatValue(jumpRangeMatch[1].trim());

  const odMatch = fullText.match(
    /Déf\.\s*extérieure:\s*([^:\t]+?)(?=\s*(?:Dextérité|$))/
  );
  if (odMatch) stats.od = parseStatValue(odMatch[1].trim());

  const haMatch = fullText.match(
    /Dextérité:\s*([^:\t]+?(?:\s*\(\d+\))?)\s*(?=Dribble|$)/
  );
  if (haMatch) stats.ha = parseStatValue(haMatch[1].trim());

  const drMatch = fullText.match(
    /Dribble:\s*([^:\t]+?(?:\s*\(\d+\))?)\s*(?=Passe|$)/
  );
  if (drMatch) stats.dr = parseStatValue(drMatch[1].trim());

  const paMatch = fullText.match(/Passe:\s*([^:\t]+?)(?=\s*(?:Shoot|$))/);
  if (paMatch) stats.pa = parseStatValue(paMatch[1].trim());

  const isMatch = fullText.match(
    /Shoot\s+intérieur:\s*([^:\t]+?)(?=\s*(?:Déf\.|$))/
  );
  if (isMatch) stats.is = parseStatValue(isMatch[1].trim());

  const idMatch = fullText.match(
    /Déf\.\s*intérieure:\s*([^:\t]+?)(?=\s*(?:Rebond|$))/
  );
  if (idMatch) stats.id = parseStatValue(idMatch[1].trim());

  const rbMatch = fullText.match(/Rebond:\s*([^:\t]+?)(?=\s*(?:Contre|$))/);
  if (rbMatch) stats.rb = parseStatValue(rbMatch[1].trim());

  const sbMatch = fullText.match(
    /Contre:\s*([^:\t]+?(?:\s*\(\d+\))?)\s*(?=Endurance|$)/
  );
  if (sbMatch) stats.sb = parseStatValue(sbMatch[1].trim());

  const stMatch = fullText.match(/Endurance:\s*([^:\t]+?)(?=\s*(?:Lancer|$))/);
  if (stMatch) stats.st = parseStatValue(stMatch[1].trim());

  const ftMatch = fullText.match(
    /Lancer\s+franc:\s*([^:\t]+?)(?=\s*(?:[↑↓]|Experience|$))/
  );
  if (ftMatch) stats.ft = parseStatValue(ftMatch[1].trim());

  const exMatch = fullText.match(/Experience:\s*([^:\t]+?)(?=\s*(?:TC|$))/);
  if (exMatch) stats.ex = parseStatValue(exMatch[1].trim());

  return {
    id: playerId,
    firstName,
    lastName,
    countryId,
    potential,
    age,
    salary,
    stats,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { batchText } = await request.json();

    if (!batchText) {
      return NextResponse.json(
        { error: "Pas de texte fourni" },
        { status: 400 }
      );
    }

    // Split players by country markers at the start of lines
    const playerSections = batchText
      .split(/(?=\n\[[^\]]+\])/g)
      .map((section: string) => section.trim())
      .filter(
        (section: string) => section.length > 0 && section.startsWith("[")
      );

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const section of playerSections) {
      try {
        const player = parsePlayer(section);

        // Submit each player using the existing scouting API logic
        const response = await fetch(
          `${
            process.env.NEXTAUTH_URL || "http://localhost:3000"
          }/api/scouting/submit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              playerId: player.id,
              playerData: {
                id: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
                countryId: player.countryId,
                potential: player.potential,
              },
              scoutingData: {
                age: player.age,
                salary: player.salary,
                gs: player.stats.gs,
                js: player.stats.js,
                jr: player.stats.jr,
                od: player.stats.od,
                ha: player.stats.ha,
                dr: player.stats.dr,
                pa: player.stats.pa,
                is: player.stats.is,
                id: player.stats.id,
                rb: player.stats.rb,
                sb: player.stats.sb,
                st: player.stats.st,
                ft: player.stats.ft,
                ex: player.stats.ex,
                scoutedAt: new Date().toISOString().slice(0, 16),
              },
            }),
          }
        );

        if (response.ok) {
          success++;
        } else {
          failed++;
          errors.push(
            `Erreur serveur pour ${player.firstName} ${player.lastName} (${player.id})`
          );
        }
      } catch (error) {
        failed++;
        const errorMsg =
          error instanceof Error ? error.message : "Erreur inconnue";
        errors.push(`Erreur de parsing: ${errorMsg}`);
      }
    }

    return NextResponse.json({
      success,
      failed,
      errors,
    });
  } catch (error) {
    console.error("Batch processing error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
