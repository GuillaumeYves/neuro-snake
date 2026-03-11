import { state } from "./state.js";
import { gameContainer } from "./dom.js";
import {
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  GOLDEN_APPLE_CHANCE,
  SPAWN_MARGIN,
} from "./config.js";
import { growSnake } from "./snake.js";
import { updateScore, showScorePopup } from "./score.js";
import { playAppleSound, playGoldenAppleSound } from "./sound.js";
import {
  trySpawnBonus,
  checkCollectBonus,
  clearMultiplierBadge,
} from "./bonus.js";

export function resetApples() {
  document.querySelectorAll(".apple").forEach((apple) => apple.remove());
  spawnApple();
}

export function spawnApple() {
  // On liste toutes les cases occupées par le serpent pour ne pas y spawner une pomme
  const occupiedCells = new Set(
    state.snakeParts.map((part) => `${part.style.left},${part.style.top}`),
  );

  // On construit la liste des cases libres en évitant le bord (SPAWN_MARGIN)
  const freeCells = [];
  for (let row = SPAWN_MARGIN; row < GRID_ROWS - SPAWN_MARGIN; row++) {
    for (let col = SPAWN_MARGIN; col < GRID_COLS - SPAWN_MARGIN; col++) {
      const cellKey = `${col * CELL_SIZE}px,${row * CELL_SIZE}px`;
      if (!occupiedCells.has(cellKey)) {
        freeCells.push([col, row]);
      }
    }
  }

  if (freeCells.length === 0) return;

  // On choisit une case libre au hasard
  const [col, row] = freeCells[Math.floor(Math.random() * freeCells.length)];
  const isGolden = Math.random() < GOLDEN_APPLE_CHANCE;

  const apple = document.createElement("div");
  apple.classList.add("apple");
  if (isGolden) apple.classList.add("golden-apple");
  apple.dataset.value = isGolden ? 10 : 1;
  apple.style.left = col * CELL_SIZE + "px";
  apple.style.top = row * CELL_SIZE + "px";
  gameContainer.appendChild(apple);
}

export function checkEatApple() {
  const head = state.snakeParts[0];

  // On vérifie si la tête touche un bonus pickup à ce tick
  checkCollectBonus();

  for (const apple of document.querySelectorAll(".apple")) {
    const headIsOnApple =
      apple.style.left === head.style.left &&
      apple.style.top === head.style.top;

    if (headIsOnApple) {
      const basePoints = parseInt(apple.dataset.value);
      // Si un multiplicateur est actif (X2, X3, X5)
      const points = basePoints * state.activeMultiplier;
      const isGolden = apple.classList.contains("golden-apple");

      showScorePopup(apple.style.left, apple.style.top, points, isGolden);
      apple.remove();
      growSnake();
      updateScore(state.score + points);

      if (isGolden) {
        playGoldenAppleSound();
      } else {
        playAppleSound();
      }

      // Le multiplicateur ne s'applique qu'une seule fois donc on le remet à 1
      if (state.activeMultiplier > 1) {
        state.activeMultiplier = 1;
        clearMultiplierBadge();
      }

      trySpawnBonus();
      spawnApple();
      break;
    }
  }
}
