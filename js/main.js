// Point d'entrée de l'application
import "./responsive.js";
import { initInput } from "./input.js";
import { showOverlay } from "./overlay.js";

initInput();

showOverlay(
  "SNAKE",
  "Appuyer sur <span class='key'>ESPACE</span> pour jouer",
  "",
);
