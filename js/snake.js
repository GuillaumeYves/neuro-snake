import { state } from "./state.js";
import { gameContainer } from "./dom.js";
import { CELL_SIZE } from "./config.js";

function createSnakePart(col, row, isHead = false) {
  const part = document.createElement("div");
  part.classList.add("snake-part");

  if (isHead) {
    part.classList.add("snake-head");
    // data-dir est lu par le CSS pour orienter les yeux dans la bonne direction
    part.dataset.dir = "right";

    const eye1 = document.createElement("div");
    eye1.classList.add("snake-eye", "eye-1");
    const eye2 = document.createElement("div");
    eye2.classList.add("snake-eye", "eye-2");
    part.appendChild(eye1);
    part.appendChild(eye2);
  }

  part.style.left = col * CELL_SIZE + "px";
  part.style.top = row * CELL_SIZE + "px";
  return part;
}

export function resetSnake() {
  for (const part of state.snakeParts) {
    part.remove();
  }
  state.snakeParts = [];

  const head = createSnakePart(0, 0, true);
  gameContainer.appendChild(head);
  state.snakeParts.push(head);
}

export function moveSnake() {
  const parts = state.snakeParts;

  // On déplace les segments de la queue vers l'avant, en partant du dernier pour ne pas écraser la position d'un segment avant de l'avoir copié
  for (let i = parts.length - 1; i > 0; i--) {
    parts[i].style.left = parts[i - 1].style.left;
    parts[i].style.top = parts[i - 1].style.top;
  }

  const head = parts[0];
  let x = parseInt(head.style.left);
  let y = parseInt(head.style.top);

  if (state.direction === "left") x -= CELL_SIZE;
  if (state.direction === "right") x += CELL_SIZE;
  if (state.direction === "up") y -= CELL_SIZE;
  if (state.direction === "down") y += CELL_SIZE;

  head.style.left = x + "px";
  head.style.top = y + "px";
  head.dataset.dir = state.direction;
}

export function growSnake() {
  const tail = state.snakeParts[state.snakeParts.length - 1];

  // Le nouveau segment est placé sur la queue
  const newPart = document.createElement("div");
  newPart.classList.add("snake-part");
  newPart.style.left = tail.style.left;
  newPart.style.top = tail.style.top;
  gameContainer.appendChild(newPart);
  state.snakeParts.push(newPart);
}
