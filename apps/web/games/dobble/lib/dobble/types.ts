export interface DobbleSymbol {
  id: number;
  rotation: number;
  scale: string;
  x: number; // Percentage from center (0-100)
  y: number; // Percentage from center (0-100)
}
export interface DobbleCard {
  symbols: DobbleSymbol[];
}
