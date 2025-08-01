export enum Continents {
  Europe = "EUROPE",
  America = "AMERICA",
  Asia = "ASIA",
  Africa = "AFRICA",
}

export type GameShapeRange = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export enum Positions {
  PG = "PG",
  SG = "SG",
  SF = "SF",
  PF = "PF",
  C = "C",
}

export enum TwoPositions {
  Guard = "PG-SG",
  Wingman = "SG-SF",
  Forward = "SF-PF",
  Bigman = "PF-C",
}

export interface PlayerWeek {
  season: number;
  id: number;
  weekStart: Date;
  gameShape: GameShapeRange;
  dmi: number;
}

export interface PlayerSeason {
  id: number;
  trainings: PlayerTrainings[];
}

export interface PlayerTrainings {
  position: Positions | TwoPositions;
  count: number;
  partials: number;
}
