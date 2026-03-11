import { state } from "./state.js";
import { scoreDisplay, gameContainer } from "./dom.js";
import { CELL_SIZE } from "./config.js";

export function updateScore(newScore) {
  state.score = newScore;
  scoreDisplay.textContent = newScore;
  scoreDisplay.classList.remove("score-flash");
  void scoreDisplay.offsetWidth;
  scoreDisplay.classList.add("score-flash");
}

export function showScorePopup(left, top, points, isGolden) {
  const popup = document.createElement("div");
  popup.classList.add("score-popup");
  popup.textContent = "+" + points;
  popup.style.color = isGolden ? "var(--gold)" : "var(--apple)";
  popup.style.textShadow = isGolden ? "var(--glow-gold)" : "var(--glow-a)";
  popup.style.left = left;
  popup.style.top = parseInt(top) + CELL_SIZE / 4 + "px";
  gameContainer.appendChild(popup);
  popup.addEventListener("animationend", () => popup.remove());
}
