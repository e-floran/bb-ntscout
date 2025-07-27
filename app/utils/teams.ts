import { Continents } from "./types";

export const mainCountriesByContinent: Map<Continents, string[]> = new Map<
  Continents,
  string[]
>([
  [Continents.Europe, ["11", "7", "10", "58", "15", "13"]],
  [Continents.America, ["1", "2", "3"]],
  [Continents.Asia, ["47", "5", "45", "50"]],
  [Continents.Africa, ["93", "32", "51"]],
]);
