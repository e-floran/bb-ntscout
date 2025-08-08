export interface GameShapeHistory {
  weekId: number;
  gameShape: number;
  dmi: number;
  date: string;
}

export interface PlayerWithHistory {
  id: string;
  name: string;
  position?: string;
  gameShapeHistory?: GameShapeHistory[];
  currentGameShape?: number;
  currentDMI?: number;
  gameShapeChange?: number;
  dmiChange?: number;
}
