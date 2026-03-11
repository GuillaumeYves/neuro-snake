import { state } from "./state.js";
import { GAME_SPEED_MS } from "./config.js";
import { showOverlay, hideOverlay } from "./overlay.js";
import { resetSnake, moveSnake } from "./snake.js";
import { resetApples, checkEatApple } from "./apple.js";
import { isOutOfBounds, isCollidingWithSelf } from "./collision.js";
import { updateScore } from "./score.js";
import { playGameOverSound } from "./sound.js";
import { resetBonus } from "./bonus.js";

// Point d'entrée unique pour démarrer, mettre en pause ou reprendre le jeu
export function handleStart() {
  if (!state.isRunning) {
    startGame();
  } else if (state.isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

export function startGame() {
  resetSnake();
  resetApples();
  resetBonus();
  updateScore(0);

  state.direction = "right";
  state.nextDirection = "right";
  state.isRunning = true;
  state.isPaused = false;

  hideOverlay();
  // setInterval appelle gameTick toutes les GAME_SPEED_MS
  state.gameLoop = setInterval(gameTick, GAME_SPEED_MS);
}

export function pauseGame() {
  state.isPaused = true;
  // On arrête la boucle
  clearInterval(state.gameLoop);
  showOverlay(
    "PAUSE",
    "Appuyer sur <span class='key'>ESPACE</span> pour reprendre",
    "paused-text",
  );
}

export function resumeGame() {
  state.isPaused = false;
  hideOverlay();
  state.gameLoop = setInterval(gameTick, GAME_SPEED_MS);
}

export function gameOver() {
  clearInterval(state.gameLoop);
  state.isRunning = false;
  playGameOverSound();
  showOverlay(
    "GAME OVER",
    `Score : ${state.score}<br><br>Appuyer sur <span class='key'>ESPACE</span> pour rejouer`,
    "gameover-text",
  );
}

function gameTick() {
  // On applique la direction demandée par le joueur au début de chaque tick
  state.direction = state.nextDirection;
  moveSnake();

  if (isOutOfBounds() || isCollidingWithSelf()) {
    gameOver();
    // On stoppe le tick immédiatement pour éviter de faire quoi que ce soit d'autre après la mort
    return;
  }

  checkEatApple();
}
