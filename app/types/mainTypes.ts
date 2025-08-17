import { Continents, PlayerSeason, PlayerSkillset, PlayerWeek } from "./types";

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
  id: string; // Senior NTs start from 1, junior NTs have the same ID than the Senior NT from the same country + 1000
  players: string[];
  isJunior: boolean;
  continent: Continents;
}

export interface ScoutedPlayer {
  id: number;
  firstName: string;
  lastName: string;
  countryId: number;
  auctionOver: string;
  age: number;
  salary: number;
  skillset: PlayerSkillset;
  gs: number;
  potential: number;
  tce: number;
  tci: number;
  tc: number;
}
