import { state } from "./state.js";
import { CELL_SIZE, GRID_COLS, GRID_ROWS } from "./config.js";

export function isOutOfBounds() {
  const head = state.snakeParts[0];
  const x = parseInt(head.style.left);
  const y = parseInt(head.style.top);

  // On vérifie que la tête ne dépasse pas les 4 bords de la grille
  return (
    x < 0 || y < 0 || x >= GRID_COLS * CELL_SIZE || y >= GRID_ROWS * CELL_SIZE
  );
}

export function isCollidingWithSelf() {
  const head = state.snakeParts[0];
  const headX = parseInt(head.style.left);
  const headY = parseInt(head.style.top);

  // On commence à 1 pour ne pas comparer la tête avec elle-même
  for (let i = 1; i < state.snakeParts.length; i++) {
    const partX = parseInt(state.snakeParts[i].style.left);
    const partY = parseInt(state.snakeParts[i].style.top);
    if (partX === headX && partY === headY) {
      return true;
    }
  }

  return false;
}
