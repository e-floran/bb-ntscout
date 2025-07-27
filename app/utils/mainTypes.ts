import { Continents, PlayerSeason, PlayerWeek } from "./types";

export interface User {
  login: string;
  mainTeamId: string;
  active: boolean;
}

export interface Player {
  id: string;
  weeks: PlayerWeek[];
  seasons: PlayerSeason[];
}

export interface Team {
  id: string;
  players: string[];
  isJunior: boolean;
  continent: Continents;
}
