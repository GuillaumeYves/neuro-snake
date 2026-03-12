// Point d'entrée — mode manuel + mode Auto IA
import "./responsive.js";
import { initInput } from "./input.js";
import { showOverlay } from "./overlay.js";
import { AITrainer } from "./ai_trainer.js";

// Mode Manuel
initInput();
showOverlay(
  "SNAKE",
  "Appuyer sur <span class='key'>ESPACE</span> pour jouer",
  "",
);

// Mode Auto IA
const containers = [0, 1, 2, 3].map((i) =>
  document.getElementById(`agent-container-${i}`),
);
const statsEl = document.getElementById("brain-stats");
const startBtn = document.getElementById("brain-start-btn");

const trainer = new AITrainer(containers, statsEl, startBtn);

// Callback de score : met à jour le label de chaque agent visible
trainer.onAgentEat = (agentIndex, score) => {
  const el = document.getElementById(`agent-score-${agentIndex}`);
  if (el) el.textContent = score;
};

startBtn.addEventListener("click", () => trainer.toggle());

// Disclaimer
const disclaimerModal = document.getElementById("ai-disclaimer");
const disclaimerOkBtn = document.getElementById("ai-disclaimer-ok");
const disclaimerCancel = document.getElementById("ai-disclaimer-cancel");
const popBtns = document.querySelectorAll(".pop-btn");
let selectedPop = 1000; // valeur par défaut

// Gestion des boutons de sélection de population dans le popup
popBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    popBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedPop = parseInt(btn.dataset.pop);
  });
});

// Valider → appliquer la population, afficher le panneau IA
disclaimerOkBtn.addEventListener("click", () => {
  disclaimerModal.classList.add("hidden");
  trainer.population = selectedPop;
  manualPanel.classList.remove("active");
  brainPanel.classList.add("active");
  labelManual.classList.remove("active");
  labelBrain.classList.add("active");
});

// Annuler → remettre le switch en position Manuel sans rien changer
disclaimerCancel.addEventListener("click", () => {
  disclaimerModal.classList.add("hidden");
  toggle.checked = false;
  labelManual.classList.add("active");
  labelBrain.classList.remove("active");
});

// Toggle Manuel / Auto
const toggle = document.getElementById("mode-toggle");
const manualPanel = document.getElementById("manual-mode");
const brainPanel = document.getElementById("ai-game-panel");
const labelManual = document.getElementById("label-manual");
const labelBrain = document.getElementById("label-brain");

toggle.addEventListener("change", () => {
  if (toggle.checked) {
    // Afficher le popup disclaimer avant de basculer
    disclaimerModal.classList.remove("hidden");
  } else {
    // Retour manuel : cacher le panneau IA et stopper l'entraînement
    brainPanel.classList.remove("active");
    manualPanel.classList.add("active");
    labelBrain.classList.remove("active");
    labelManual.classList.add("active");
    trainer.stop();
  }
});
