import { state } from "./state.js";
import { gameContainer } from "./dom.js";
import {
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  SPAWN_MARGIN,
  BONUS_SPAWN_CHANCE,
  BONUS_DURATION_MS,
  BONUS_TYPES,
} from "./config.js";
import { playBonusCollectSound } from "./sound.js";

const multiplierBadge = document.getElementById("multiplier-badge");

const BONUS_COLORS = {
  "bonus-x2": { color: "#00aaff", border: "#00aaff" },
  "bonus-x3": { color: "#cc44ff", border: "#cc44ff" },
  "bonus-x5": { color: "#ff4488", border: "#ff4488" },
};

// On exclut les cases du serpent ET les cases déjà prises par une pomme ou un bonus
function getFreeCells() {
  const takenKeys = new Set([
    ...Array.from(state.snakeParts).map(
      (p) => `${p.style.left},${p.style.top}`,
    ),
    ...Array.from(document.querySelectorAll(".apple, .bonus-pickup")).map(
      (el) => `${el.style.left},${el.style.top}`,
    ),
  ]);

  const free = [];
  for (let row = SPAWN_MARGIN; row < GRID_ROWS - SPAWN_MARGIN; row++) {
    for (let col = SPAWN_MARGIN; col < GRID_COLS - SPAWN_MARGIN; col++) {
      const key = `${col * CELL_SIZE}px,${row * CELL_SIZE}px`;
      if (!takenKeys.has(key)) {
        free.push([col, row]);
      }
    }
  }
  return free;
}

export function trySpawnBonus() {
  // Un seul bonus à la fois sur le plateau
  const alreadyHasBonus = document.querySelector(".bonus-pickup") !== null;
  if (alreadyHasBonus) return;

  // Le bonus n'apparaît pas à chaque pomme mangée, seulement avec une certaine probabilité
  if (Math.random() >= BONUS_SPAWN_CHANCE) return;

  const freeCells = getFreeCells();
  if (freeCells.length === 0) return;

  const [col, row] = freeCells[Math.floor(Math.random() * freeCells.length)];
  const bonusType = BONUS_TYPES[Math.floor(Math.random() * BONUS_TYPES.length)];

  const pickup = document.createElement("div");
  pickup.classList.add("bonus-pickup", bonusType.cssClass);
  pickup.dataset.multiplier = bonusType.multiplier;
  pickup.dataset.label = bonusType.label;
  pickup.dataset.cssClass = bonusType.cssClass;
  pickup.textContent = bonusType.label;
  pickup.style.left = col * CELL_SIZE + "px";
  pickup.style.top = row * CELL_SIZE + "px";
  gameContainer.appendChild(pickup);

  // Le bonus disparaît automatiquement après BONUS_DURATION_MS si pas ramassé
  state.bonusExpireTimer = setTimeout(() => {
    pickup.classList.add("expiring");
    setTimeout(() => pickup.remove(), 800);
  }, BONUS_DURATION_MS);
}

export function checkCollectBonus() {
  const head = state.snakeParts[0];

  for (const pickup of document.querySelectorAll(".bonus-pickup")) {
    const headIsOnPickup =
      pickup.style.left === head.style.left &&
      pickup.style.top === head.style.top;

    if (headIsOnPickup) {
      // On annule le timer d'expiration puisque le bonus a été collecté
      clearTimeout(state.bonusExpireTimer);
      state.activeMultiplier = parseInt(pickup.dataset.multiplier);
      const cssClass = pickup.dataset.cssClass;
      pickup.remove();
      playBonusCollectSound();
      showMultiplierBadge(pickup.dataset.label, cssClass);
      break;
    }
  }
}

function showMultiplierBadge(label, cssClass) {
  const colors = BONUS_COLORS[cssClass];
  multiplierBadge.textContent = label;
  multiplierBadge.style.color = colors.color;
  multiplierBadge.style.borderColor = colors.border;
  multiplierBadge.style.boxShadow = `0 0 8px ${colors.color}88`;
  multiplierBadge.className = "active";
}

export function clearMultiplierBadge() {
  multiplierBadge.textContent = "";
  multiplierBadge.className = "";
}

export function resetBonus() {
  clearTimeout(state.bonusExpireTimer);
  document.querySelectorAll(".bonus-pickup").forEach((el) => el.remove());
  state.activeMultiplier = 1;
  clearMultiplierBadge();
}
