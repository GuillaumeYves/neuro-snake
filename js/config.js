// Constantes globales du jeu

export const CELL_SIZE = 50;
export const GRID_COLS = 16;
export const GRID_ROWS = 16;
export const SPAWN_MARGIN = 1;
export const GAME_SPEED_MS = 160;
export const GOLDEN_APPLE_CHANCE = 0.06;

export const BONUS_SPAWN_CHANCE = 0.3;
export const BONUS_DURATION_MS = 7000;

export const BONUS_TYPES = [
  { multiplier: 2, label: "X2", cssClass: "bonus-x2" },
  { multiplier: 3, label: "X3", cssClass: "bonus-x3" },
  { multiplier: 5, label: "X5", cssClass: "bonus-x5" },
];

export const OPPOSITE_DIRECTION = {
  left: "right",
  right: "left",
  up: "down",
  down: "up",
};
