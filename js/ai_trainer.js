// C'est le chef d'orchestre du mode Auto IA.
// PRINCIPE DE L'ALGORITHME GÉNÉTIQUE :
//   1. On crée N agents avec des réseaux de neurones aléatoires
//   2. On les laisse jouer jusqu'à ce qu'ils meurent tous
//   3. On mesure leur "fitness" (performance)
//   4. Les meilleurs "survivent" et leurs poids sont transmis à la génération suivante
//   5. On répète → les agents s'améliorent progressivement
// ARCHITECTURE DU RÉSEAU (pour chaque agent) :
//   13 entrées → 16 neurones cachés → 3 sorties
//   (danger, pomme, bonus...)   (couche cachée)   (tout droit / gauche / droite)

import { BrainAgent } from "./ai_agent.js";

// Architecture du réseau de neurones
// Doit correspondre à la taille du vecteur retourné par getInputVector() (13 valeurs)
const ARCH = [13, 16, 3]; // 13 entrées → 16 neurones → 3 sorties

// Fonction d'activation sigmoid : transforme n'importe quel nombre en valeur entre 0 et 1
// C'est ce qui permet au réseau de "décider" avec des probabilités
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

// Réseau de neurones feedforward (propagation avant uniquement)
// Un réseau = un ensemble de poids (weights) et de biais (biases)
// Les poids sont les "gènes" de l'agent : ils évoluent génération après génération
class Net {
  constructor() {
    // Initialisation aléatoire des poids avec la méthode He (recommandée pour sigmoid)
    // He = échelle proportionnelle à √(2/nb_entrées) pour éviter explosion/disparition du gradient
    this.weights = [];
    this.biases = [];
    for (let l = 1; l < ARCH.length; l++) {
      const fan = ARCH[l - 1]; // nombre de neurones de la couche précédente
      const scale = Math.sqrt(2 / fan);
      this.weights.push(
        Array.from({ length: ARCH[l] }, () =>
          Array.from({ length: fan }, () => (Math.random() * 2 - 1) * scale),
        ),
      );
      this.biases.push(Array.from({ length: ARCH[l] }, () => 0));
    }
  }

  // Propagation avant : fait passer les inputs de couche en couche
  // Chaque neurone calcule : sigmoid( somme(w_i * a_i) + biais )
  run(inputs) {
    let a = inputs;
    for (let l = 0; l < this.weights.length; l++) {
      const W = this.weights[l];
      const b = this.biases[l];
      a = W.map((row, i) =>
        sigmoid(row.reduce((s, w, j) => s + w * a[j], b[i])),
      );
    }
    return a; // [score_tout_droit, score_gauche, score_droite]
  }

  // Croisement génétique : crée un enfant en mélangeant les poids de deux parents
  // Chaque poids a 50% de chance de venir du parent A ou du parent B
  crossover(otherNet) {
    const child = new Net();
    for (let l = 0; l < this.weights.length; l++) {
      for (let i = 0; i < this.weights[l].length; i++) {
        for (let j = 0; j < this.weights[l][i].length; j++) {
          child.weights[l][i][j] =
            Math.random() < 0.5
              ? this.weights[l][i][j]
              : otherNet.weights[l][i][j];
        }
        child.biases[l][i] =
          Math.random() < 0.5 ? this.biases[l][i] : otherNet.biases[l][i];
      }
    }
    return child;
  }

  // Sérialise le réseau en objet JSON (pour le cloner)
  toJSON() {
    return {
      weights: this.weights,
      biases: this.biases,
    };
  }

  // Charge un réseau depuis un objet JSON
  fromJSON(json) {
    this.weights = json.weights.map((layer) => layer.map((row) => [...row]));
    this.biases = json.biases.map((layer) => [...layer]);
    return this;
  }

  // Retourne une copie indépendante de ce réseau (les deux peuvent évoluer séparément)
  clone() {
    return new Net().fromJSON(this.toJSON());
  }
}

// Constantes de simulation
const AI_SPEED_MS = 60; // Intervalle (ms) pour les agents visibles
const AI_CELL_SIZE = 24; // Doit correspondre à --cell: 24px dans _ai-game.scss
const VISIBLE_AGENTS = 4; // Nombre d'agents avec rendu visuel (fixé par le HTML)

export class AITrainer {
  /**
   * @param {HTMLElement[]} containers - Les 4 divs HTML pour les agents visibles
   * @param {HTMLElement}   statsEl    - La div d'affichage des statistiques
   * @param {HTMLElement}   startBtn   - Le bouton ENTRAÎNER / ARRÊTER
   */
  constructor(containers, statsEl, startBtn) {
    this.containers = containers;
    this.statsEl = statsEl;
    this.startBtn = startBtn;

    this.agents = [];
    this.population = 1000; // valeur par défaut, modifiable avant start()
    this.generation = 0;
    this.bestScore = 0;
    this.aliveCount = 0;
    this.isRunning = false;
    this.history = []; // historique des meilleurs scores par génération

    this._rafId = null; // ID de la boucle requestAnimationFrame

    // Callback optionnel : appelé quand un agent visible mange une pomme
    this.onAgentEat = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.generation = 0;
    this.bestScore = 0;
    this.history = [];

    // Créer tous les agents (visibles + headless)
    this.agents = [];
    for (let i = 0; i < this.population; i++) {
      const isVisible = i < VISIBLE_AGENTS;
      const container = isVisible ? this.containers[i] : null;

      const agent = new BrainAgent(container, new Net(), {
        cellSize: AI_CELL_SIZE,
        speed: AI_SPEED_MS,
        headless: !isVisible,
      });
      // Quand un agent meurt, on le signale au trainer
      agent.engine.onDie = () => this._onAgentDie(agent);
      this.agents.push(agent);
    }

    this._startGeneration();
    if (this.startBtn) this.startBtn.textContent = "■ ARRÊTER";
  }

  stop() {
    this.isRunning = false;
    // Annuler la boucle d'animation des headless
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    // Arrêter tous les agents (libère les setInterval des agents visibles)
    this.agents.forEach((a) => a.stop());
    if (this.startBtn) this.startBtn.textContent = "▶ ENTRAÎNER";
    this._updateStats();
  }

  toggle() {
    this.isRunning ? this.stop() : this.start();
  }

  _startGeneration() {
    this.generation++;
    this.aliveCount = this.population;

    // Remettre les slots visuels à l'état "vivant"
    this.containers.forEach((c) =>
      c.closest(".agent-slot")?.classList.remove("is-dead"),
    );
    this.agents.forEach((_, i) => {
      const el = document.getElementById(`agent-score-${i}`);
      if (el) el.textContent = "0";
    });

    // Démarrer tous les agents
    this.agents.forEach((agent, i) => {
      agent.reset();
      // onEat est effacé par reset() → on le rebranche ici
      agent.engine.onEat = (score) => {
        if (this.onAgentEat && i < VISIBLE_AGENTS) this.onAgentEat(i, score);
      };
      agent.start();
    });

    // Lancer la boucle RAF pour simuler les agents headless en lot
    this._startHeadlessBatchLoop();
    this._updateStats();
  }

  // À chaque appel, on fait PLUSIEURS ticks pour chaque agent headless.
  _startHeadlessBatchLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    // Nombre de ticks simulés par frame : plus la population est grande, moins on en fait
    const ticksPerFrame = this._getTicksPerFrame();

    const loop = () => {
      if (!this.isRunning) return;

      // Pour chaque agent headless encore vivant : simuler plusieurs ticks d'un coup
      for (const agent of this.agents) {
        if (!agent.isAlive || !agent.engine.isHeadless) continue;
        for (let t = 0; t < ticksPerFrame; t++) {
          // On vérifie isRunning à chaque tick car _tickOnce() peut appeler _die()
          if (!agent.engine.isRunning) break;
          agent.engine._tickOnce();
        }
      }

      // On re-planifie la prochaine frame
      this._rafId = requestAnimationFrame(loop);
    };

    this._rafId = requestAnimationFrame(loop);
  }

  // Calcule le nombre optimal de ticks par frame selon la taille de la population
  _getTicksPerFrame() {
    if (this.population <= 100) return 80;
    if (this.population <= 500) return 40;
    if (this.population <= 1000) return 20;
    if (this.population <= 2000) return 12;
    else return 8; // 3000+
  }

  _onAgentDie(agent) {
    agent.isAlive = false;
    this.aliveCount = Math.max(0, this.aliveCount - 1);

    // Marquer visuellement le slot comme mort (si agent visible)
    if (agent.engine.container?.parentNode) {
      agent.engine.container.closest(".agent-slot")?.classList.add("is-dead");
    }

    if (agent.score > this.bestScore) this.bestScore = agent.score;
    this._updateStats();

    // Quand TOUS les agents sont morts → passer à la génération suivante
    if (this.aliveCount === 0 && this.isRunning) {
      // Petit délai pour laisser le temps au rendu de se mettre à jour
      setTimeout(() => this._nextGeneration(), 10);
    }
  }

  _nextGeneration() {
    if (!this.isRunning) return;

    // Annuler la boucle headless de la génération qui vient de finir
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    // Trier les agents du meilleur au moins bon (par fitness)
    const sorted = [...this.agents].sort((a, b) => b.fitness - a.fitness);
    const eliteNet = sorted[0].net;

    this.history.push(sorted[0].score);
    if (this.history.length > 20) this.history.shift();

    // On reconstitue une population complète à partir des meilleurs agents :
    // 1 élite        → copie exacte du "champion" (on préserve le meilleur réseau)
    // 40% crossover  → enfants issus de 2 parents du top 10% + légère mutation
    // 40% clones     → copies du top 5% avec mutation modérée
    // ~20% aléatoire → nouveaux réseaux aléatoires (exploration / diversité génétique)

    const newNets = [];
    newNets.push(eliteNet.clone()); // 1. Élite intacte

    const crossoverCount = Math.floor(this.population * 0.4);
    const cloneCount = Math.floor(this.population * 0.4);
    const randomCount = this.population - 1 - crossoverCount - cloneCount;

    const top10 = Math.max(2, Math.floor(this.population * 0.1));
    const top5 = Math.max(1, Math.floor(this.population * 0.05));

    // 2. Crossover : mélange génétique entre parents du top 10%
    for (let i = 0; i < crossoverCount; i++) {
      const parentA = sorted[Math.floor(Math.random() * top10)].net;
      const parentB = sorted[Math.floor(Math.random() * top10)].net;
      newNets.push(this._mutate(parentA.crossover(parentB), 0.05, 0.1));
    }

    // 3. Clones mutés : copies du top 5% avec mutation un peu plus forte
    for (let i = 0; i < cloneCount; i++) {
      newNets.push(this._mutate(sorted[i % top5].net.clone(), 0.1, 0.2));
    }

    // 4. Exploration pure : réseaux totalement aléatoires
    for (let i = 0; i < randomCount; i++) {
      newNets.push(new Net());
    }

    // Assigner les nouveaux réseaux aux agents existants (on réutilise les instances)
    this.agents.forEach((agent, i) => {
      agent.net = newNets[i];
      agent.engine.onDie = () => this._onAgentDie(agent);
    });

    this._startGeneration();
  }

  // Mutation : perturbe aléatoirement une fraction des poids du réseau
  // rate     = probabilité qu'un poids soit muté (ex: 0.10 = 10% des poids)
  // strength = amplitude maximale de la perturbation
  _mutate(net, rate, strength) {
    net.weights = net.weights.map((layer) =>
      layer.map((row) =>
        row.map((w) =>
          Math.random() < rate ? w + (Math.random() * 2 - 1) * strength : w,
        ),
      ),
    );
    net.biases = net.biases.map((layer) =>
      layer.map((b) =>
        Math.random() < rate ? b + (Math.random() * 2 - 1) * strength : b,
      ),
    );
    return net;
  }

  _updateStats() {
    if (!this.statsEl) return;
    const visibleScores = this.agents
      .slice(0, VISIBLE_AGENTS)
      .map((a) => a.score);

    this.statsEl.innerHTML = `
      <div class="bs-item">
        <span class="bs-label">ITÉRATION</span>
        <span class="bs-val">${this.generation}</span>
      </div>
      <div class="bs-item">
        <span class="bs-label">AGENTS</span>
        <span class="bs-val">${this.population}</span>
      </div>
      <div class="bs-item">
        <span class="bs-label">RECORD</span>
        <span class="bs-val accent">${this.bestScore}</span>
      </div>

      <div class="bs-agents-inline">
        ${visibleScores
          .map(
            (s, i) => `
          <div class="bs-agent ${this.agents[i]?.isAlive ? "alive" : "dead"}">
            A${i + 1} · ${s}
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }
}
