import { state } from "./state.js";
import { OPPOSITE_DIRECTION } from "./config.js";
import { handleStart } from "./game.js";

const ARROW_KEY_MAP = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

export function tryChangeDirection(newDirection) {
  // Si le jeu n'est pas lancé (game over ou pas encore démarré), on ignore l'input des flèches
  if (!state.isRunning) return;

  if (state.isPaused) {
    handleStart();
    return;
  }

  // On empêche le serpent de faire demi-tour sur lui-même
  const wouldReverseDirection =
    newDirection === OPPOSITE_DIRECTION[state.direction];
  if (!wouldReverseDirection) {
    state.nextDirection = newDirection;
  }
}

export function initInput() {
  document.addEventListener("keydown", (event) => {
    const direction = ARROW_KEY_MAP[event.key];

    if (direction) {
      // On bloque le comportement par défaut du navigateur (scroll avec les flèches du clavier)
      event.preventDefault();
      tryChangeDirection(direction);
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      handleStart();
    }
  });
}
