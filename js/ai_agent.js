// Ce fichier fait le lien entre :
//   - le réseau de neurones (Net, défini dans ai_trainer.js) qui prend des décisions
//   - le moteur de jeu (GameEngine, dans ai_game_engine.js) qui simule la partie
// Un "agent" = 1 serpent contrôlé par 1 réseau de neurones.
// ai_trainer.js crée et gère plusieurs agents en parallèle.

import { GameEngine } from "./ai_game.js";

// Correspondance direction actuelle → direction relative gauche
// Exemplee : si on va à droite et qu'on tourne à gauche (relatif), on va vers le haut
const REL_LEFT = { right: "up", up: "left", left: "down", down: "right" };
// Correspondance direction actuelle → direction relative droite
const REL_RIGHT = { right: "down", down: "left", left: "up", up: "right" };

export class BrainAgent {
  /**
   * @param {HTMLElement|null} container - La div HTML où afficher le jeu (null si headless)
   * @param {Net}              net       - Le réseau de neurones qui contrôle cet agent
   * @param {object}           options   - Options passées au moteur (cellSize, speed, headless…)
   */
  constructor(container, net, options = {}) {
    this.net = net;
    // On crée un moteur de jeu dédié à cet agent
    this.engine = new GameEngine(container, options);
    // À chaque tick du moteur, l'IA prend une décision
    this.engine.onTick = () => this._decide();
    this.isAlive = false;
  }

  // Réinitialise l'agent pour une nouvelle partie (appelé entre chaque génération)
  // Si on passe un newNet, on remplace le réseau (utilisé lors de l'évolution génétique)
  reset(newNet = null) {
    if (newNet) this.net = newNet;
    this.isAlive = true;
    this.engine.reset();
  }

  start() {
    this.isAlive = true;
    this.engine.start();
  }

  stop() {
    this.engine.stop();
    this.isAlive = false;
  }

  // Raccourcis pratiques pour accéder aux données du moteur depuis l'extérieur
  get fitness() {
    return this.engine.fitness;
  }
  get score() {
    return this.engine.score;
  }

  // Le cœur de l'IA : le réseau observe la situation et choisit une action
  _decide() {
    // 1. Le moteur construit un résumé de la situation (13 valeurs entre 0 et 1)
    const inputs = this.engine.getInputVector();

    // 2. Le réseau de neurones analyse ces 13 valeurs et retourne 3 scores
    //    output[0] = score pour "tout droit"
    //    output[1] = score pour "tourner à gauche"
    //    output[2] = score pour "tourner à droite"
    const output = this.net.run(inputs);

    // 3. On choisit l'action avec le score le plus élevé
    const maxIdx = output.indexOf(Math.max(...output));
    const dir = this.engine.direction;

    // 4. On applique la décision (les directions sont relatives à la direction actuelle)
    if (maxIdx === 1) this.engine.setDirection(REL_LEFT[dir]);
    else if (maxIdx === 2) this.engine.setDirection(REL_RIGHT[dir]);
    // Si maxIdx === 0 : on continue tout droit
  }
}
