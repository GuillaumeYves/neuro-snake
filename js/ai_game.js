// Ce fichier gère UNE instance de partie de snake, indépendante du jeu manuel.
// Chaque agent IA possède son propre GameEngine : son serpent, sa pomme, son score.
// Deux modes :
//   - visible   : un <div> HTML est mis à jour à chaque tick → on voit la partie
//   - headless  : aucun DOM, simulation pure en mémoire → très rapide
//     ⚠️  Le mode headless ne démarre PAS de setInterval lui-même.
//         C'est ai_trainer.js qui appelle _tickOnce() en lot via requestAnimationFrame.
//         Cela évite de bloquer le navigateur avec des boucles while synchrones.

import {
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  SPAWN_MARGIN,
  GOLDEN_APPLE_CHANCE,
  BONUS_SPAWN_CHANCE,
  BONUS_DURATION_MS,
  BONUS_TYPES,
} from "./config.js";

// Vecteurs de déplacement pour chaque direction
const DELTA = {
  right: { dc: 1, dr: 0 },
  left: { dc: -1, dr: 0 },
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
};

// Direction opposée (interdit de faire demi-tour)
const OPPOSITE = { left: "right", right: "left", up: "down", down: "up" };

// Directions relatives (utiles pour le vecteur d'entrée du réseau)
const REL_LEFT = { right: "up", up: "left", left: "down", down: "right" };
const REL_RIGHT = { right: "down", down: "left", left: "up", up: "right" };

export class GameEngine {
  constructor(container, options = {}) {
    // Le conteneur HTML dans lequel on dessine (null si headless)
    this.container = container;
    this.cellSize = options.cellSize ?? CELL_SIZE;
    this.cols = options.cols ?? GRID_COLS;
    this.rows = options.rows ?? GRID_ROWS;
    this.speed = options.speed ?? 160;
    // En mode headless, pas de rendu DOM donc simulation pure
    this.isHeadless = options.headless ?? false;

    // Différentes variables pour stocker l'état de la partie
    this.snake = [];
    this.apple = { col: 0, row: 0, isGolden: false };
    this.bonus = null;
    this.activeMultiplier = 1;
    this.direction = "right";
    this.nextDirection = "right";
    this.score = 0;
    this.steps = 0;
    this.stepsWithoutFood = 0;
    this.stepsSinceCloser = 0;
    this.minDistToApple = Infinity;
    this.bonusExpireStep = 0;
    this.bonusTotalSteps = 1;
    this.isRunning = false;
    this.gameLoop = null;

    // Score de fitness : mesure la "qualité" de cet agent pour l'algorithme génétique
    this.fitness = 0;

    this.onDie = null; // appelé quand le serpent meurt
    this.onEat = null; // appelé quand une pomme est mangée, avec le score actuel
    this.onTick = null; // appelé à chaque tick (utilisé par BrainAgent pour décider)

    // Éléments DOM réutilisés pour la pomme et le bonus (évite de les recréer chaque tick)
    this._appleEl = null;
    this._bonusEl = null;

    this._setupContainer();
  }

  _setupContainer() {
    if (!this.container) return;
    this.container.style.width = this.cols * this.cellSize + "px";
    this.container.style.height = this.rows * this.cellSize + "px";
    this.container.style.position = "relative";
    this.container.style.overflow = "hidden";
  }

  // Remet le moteur à zéro pour une nouvelle partie (appelé entre chaque génération)
  reset() {
    this.stop();

    // Nettoyer le DOM si on est en mode visible
    if (this.container) {
      this.container
        .querySelectorAll(".snake-part, .apple, .bonus-pickup")
        .forEach((el) => el.remove());
    }
    this._appleEl = null;
    this._bonusEl = null;

    // Placer le serpent au centre de la grille, 3 segments, direction droite
    const midCol = Math.floor(this.cols / 2);
    const midRow = Math.floor(this.rows / 2);
    this.snake = [
      { col: midCol, row: midRow },
      { col: midCol - 1, row: midRow },
      { col: midCol - 2, row: midRow },
    ];

    this.direction = "right";
    this.nextDirection = "right";
    this.score = 0;
    this.steps = 0;
    this.stepsWithoutFood = 0;
    this.stepsSinceCloser = 0;
    this.minDistToApple = Infinity;
    this.fitness = 0;
    this.activeMultiplier = 1;
    this.bonus = null;
    this.bonusExpireStep = 0;
    this.bonusTotalSteps = 1;
    this.isRunning = false;

    this._spawnApple();
    this._render();
  }

  // Lance la partie
  start() {
    this.isRunning = true;

    if (this.isHeadless) {
      return;
    }

    // Mode visible : setInterval classique, le navigateur reste fluide
    this.gameLoop = setInterval(() => this._tickOnce(), this.speed);
  }

  // Arrête proprement la boucle de jeu
  stop() {
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = null;
    this.isRunning = false;
  }

  // Change la direction (impossible de faire demi-tour)
  setDirection(dir) {
    if (dir !== OPPOSITE[this.direction]) this.nextDirection = dir;
  }

  // Rendu public pour que ai_trainer.js puisse l'appeler sur les agents headless.
  _tickOnce() {
    // Applique la direction demandée (par l'IA ou le joueur)
    this.direction = this.nextDirection;
    this.steps++;
    this.stepsWithoutFood++;

    // Expiration du bonus si le délai est dépassé
    if (this.bonus && this.steps >= this.bonusExpireStep) {
      this.bonus = null;
    }

    // Calcul de la nouvelle position de la tête
    const head = this.snake[0];
    const { dc, dr } = DELTA[this.direction];
    const newHead = { col: head.col + dc, row: head.row + dr };

    // Collision : mur ou propre corps → mort
    if (this._isOutOfBounds(newHead) || this._isOnSnake(newHead)) {
      // Petite pénalité de fitness pour mourir bêtement
      this.fitness -= 50;
      this._die();
      return;
    }

    // Déplace le serpent (on insère la nouvelle tête en premier)
    this.snake.unshift(newHead);

    // Distance de Manhattan entre la tête et la pomme
    const newDist =
      Math.abs(newHead.col - this.apple.col) +
      Math.abs(newHead.row - this.apple.row);

    // Si la tête bat son record de proximité → bonne direction → on remet le chrono à zéro
    if (newDist < this.minDistToApple) {
      this.minDistToApple = newDist;
      this.stepsSinceCloser = 0;
    } else {
      // On s'éloigne ou on reste à la même distance → le chrono avance
      this.stepsSinceCloser++;
    }

    // Ramasser un bonus pickup
    if (
      this.bonus &&
      newHead.col === this.bonus.col &&
      newHead.row === this.bonus.row
    ) {
      this.activeMultiplier = this.bonus.multiplier;
      this.fitness += 200; // Bonus pickup = bonne initiative
      this.bonus = null;
    }

    // Manger la pomme
    if (newHead.col === this.apple.col && newHead.row === this.apple.row) {
      const basePoints = this.apple.isGolden ? 10 : 1;
      const points = basePoints * this.activeMultiplier;

      this.score += points;
      // On récompense beaucoup manger (c'est l'objectif) + un peu la survie (steps).
      this.fitness += points * 1000;
      this.stepsWithoutFood = 0;
      this.activeMultiplier = 1;
      this.stepsSinceCloser = 0;
      this.minDistToApple = Infinity;

      this._spawnApple();
      this._trySpawnBonus();
      if (this.onEat) this.onEat(this.score);
      // On NE retire PAS la queue → le serpent grandit
    } else {
      // On retire le dernier segment (déplacement normal sans manger)
      this.snake.pop();
    }

    // Si le serpent n'a pas battu son record de proximité depuis trop longtemps → mort.
    // La patience augmente avec la longueur du serpent (il faut plus de temps pour contourner son corps).
    const maxPatience = 20 + Math.floor(this.snake.length / 2);
    if (this.stepsSinceCloser > maxPatience) {
      this.fitness -= 200; // Lourde pénalité pour comportement en boucle
      this._die();
      return;
    }

    // Ajouter un petit bonus de survie à chaque tick (récompense la longévité pour train encore plus loin la survie)
    this.fitness += 1;

    this._render();
    if (this.onTick) this.onTick();
  }

  // Déclenche la mort du serpent et notifie l'extérieur via onDie
  _die() {
    this.stop();
    if (this.onDie) this.onDie(this);
  }

  // Gestion des cases libres sur la grille
  _getFreeCells(extraOccupied = []) {
    // On construit un Set de toutes les cases bloquées (serpent + obstacle)
    const occupied = new Set([
      ...this.snake.map((p) => `${p.col},${p.row}`),
      ...extraOccupied.map((p) => `${p.col},${p.row}`),
    ]);
    const free = [];
    for (let r = SPAWN_MARGIN; r < this.rows - SPAWN_MARGIN; r++) {
      for (let c = SPAWN_MARGIN; c < this.cols - SPAWN_MARGIN; c++) {
        if (!occupied.has(`${c},${r}`)) free.push({ col: c, row: r });
      }
    }
    return free;
  }

  _spawnApple() {
    const extra = this.bonus ? [this.bonus] : [];
    const free = this._getFreeCells(extra);
    if (free.length === 0) return;
    const pos = free[Math.floor(Math.random() * free.length)];
    this.apple = { ...pos, isGolden: Math.random() < GOLDEN_APPLE_CHANCE };
    // Remise à zéro de la mesure de proximité pour la nouvelle pomme
    this.minDistToApple = Infinity;
    this.stepsSinceCloser = 0;
  }

  _trySpawnBonus() {
    if (this.bonus) return;
    if (Math.random() >= BONUS_SPAWN_CHANCE) return;
    const free = this._getFreeCells([this.apple]);
    if (free.length === 0) return;
    const pos = free[Math.floor(Math.random() * free.length)];
    const type = BONUS_TYPES[Math.floor(Math.random() * BONUS_TYPES.length)];
    this.bonus = { ...pos, ...type };
    this.bonusTotalSteps = Math.floor(BONUS_DURATION_MS / this.speed);
    this.bonusExpireStep = this.steps + this.bonusTotalSteps;
  }

  // Construit le vecteur de 13 valeurs envoyé au réseau de neurones
  // Le réseau ne "voit" pas la grille en entier, il reçoit 13 chiffres entre 0 et 1
  getInputVector() {
    const head = this.snake[0];
    const dir = this.direction;

    const grid = Array.from(
      { length: this.cols },
      () => new Uint8Array(this.rows),
    );
    for (let i = 0; i < this.snake.length - 1; i++) {
      const p = this.snake[i];
      if (p.col >= 0 && p.col < this.cols && p.row >= 0 && p.row < this.rows) {
        grid[p.col][p.row] = 1; // 1 = occupé par le corps
      }
    }

    // Radar : envoie un rayon dans une direction et retourne 1/distance à l'obstacle
    // → 1.0 = obstacle immédiat (danger!), 0.07 = obstacle loin (safe)
    const getRadar = (dirStr) => {
      let dist = 1;
      let cur = this._step(head, dirStr);
      while (
        cur.col >= 0 &&
        cur.row >= 0 &&
        cur.col < this.cols &&
        cur.row < this.rows &&
        grid[cur.col][cur.row] === 0
      ) {
        dist++;
        cur = this._step(cur, dirStr);
      }
      return 1 / dist;
    };

    // Danger dans les 3 directions relatives (devant, gauche, droite)
    const dangerAhead = getRadar(dir);
    const dangerLeft = getRadar(REL_LEFT[dir]);
    const dangerRight = getRadar(REL_RIGHT[dir]);

    // Position relative de la pomme (devant/derrière/gauche/droite)
    let appleAhead = 0,
      appleBehind = 0,
      appleLeft = 0,
      appleRight = 0;
    const dx = this.apple.col - head.col;
    const dy = this.apple.row - head.row;
    if (dir === "right") {
      appleAhead = dx > 0 ? 1 : 0;
      appleBehind = dx < 0 ? 1 : 0;
      appleLeft = dy < 0 ? 1 : 0;
      appleRight = dy > 0 ? 1 : 0;
    } else if (dir === "left") {
      appleAhead = dx < 0 ? 1 : 0;
      appleBehind = dx > 0 ? 1 : 0;
      appleLeft = dy > 0 ? 1 : 0;
      appleRight = dy < 0 ? 1 : 0;
    } else if (dir === "up") {
      appleAhead = dy < 0 ? 1 : 0;
      appleBehind = dy > 0 ? 1 : 0;
      appleLeft = dx < 0 ? 1 : 0;
      appleRight = dx > 0 ? 1 : 0;
    } else if (dir === "down") {
      appleAhead = dy > 0 ? 1 : 0;
      appleBehind = dy < 0 ? 1 : 0;
      appleLeft = dx > 0 ? 1 : 0;
      appleRight = dx < 0 ? 1 : 0;
    }

    // Position relative du bonus + temps restant avant expiration
    let bonusAhead = 0,
      bonusBehind = 0,
      bonusLeft = 0,
      bonusRight = 0,
      bonusTimeLeft = 0;
    if (this.bonus) {
      const bx = this.bonus.col - head.col;
      const by = this.bonus.row - head.row;
      if (dir === "right") {
        bonusAhead = bx > 0 ? 1 : 0;
        bonusBehind = bx < 0 ? 1 : 0;
        bonusLeft = by < 0 ? 1 : 0;
        bonusRight = by > 0 ? 1 : 0;
      } else if (dir === "left") {
        bonusAhead = bx < 0 ? 1 : 0;
        bonusBehind = bx > 0 ? 1 : 0;
        bonusLeft = by > 0 ? 1 : 0;
        bonusRight = by < 0 ? 1 : 0;
      } else if (dir === "up") {
        bonusAhead = by < 0 ? 1 : 0;
        bonusBehind = by > 0 ? 1 : 0;
        bonusLeft = bx < 0 ? 1 : 0;
        bonusRight = bx > 0 ? 1 : 0;
      } else if (dir === "down") {
        bonusAhead = by > 0 ? 1 : 0;
        bonusBehind = by < 0 ? 1 : 0;
        bonusLeft = bx > 0 ? 1 : 0;
        bonusRight = bx < 0 ? 1 : 0;
      }
      bonusTimeLeft = Math.max(
        0,
        (this.bonusExpireStep - this.steps) / this.bonusTotalSteps,
      );
    }

    // Le vecteur final : 13 valeurs normalisées entre 0 et 1
    return [
      dangerAhead, // 0 – radar devant
      dangerLeft, // 1 – radar gauche
      dangerRight, // 2 – radar droite
      appleAhead, // 3 – pomme devant ?
      appleLeft, // 4 – pomme à gauche ?
      appleRight, // 5 – pomme à droite ?
      appleBehind, // 6 – pomme derrière ?
      this.apple.isGolden ? 1 : 0, // 7 – pomme dorée ?
      bonusAhead, // 8 – bonus devant ?
      bonusLeft, // 9 – bonus à gauche ?
      bonusRight, // 10 – bonus à droite ?
      bonusBehind, // 11 – bonus derrière ?
      bonusTimeLeft, // 12 – temps restant du bonus (0→1)
    ];
  }

  // Calcule la case voisine dans une direction donnée
  _step({ col, row }, dir) {
    const { dc, dr } = DELTA[dir];
    return { col: col + dc, row: row + dr };
  }

  _isOutOfBounds({ col, row }) {
    return col < 0 || row < 0 || col >= this.cols || row >= this.rows;
  }

  _isOnSnake({ col, row }) {
    return this.snake.some((p) => p.col === col && p.row === row);
  }

  // Redessine le serpent la pomme et le bonus dans le conteneur HTML
  _render() {
    if (this.isHeadless || !this.container) return;
    const cs = this.cellSize;

    // Redessiner tous les segments du serpent
    this.container.querySelectorAll(".snake-part").forEach((el) => el.remove());
    this.snake.forEach((part, i) => {
      const el = document.createElement("div");
      el.className = "snake-part" + (i === 0 ? " snake-head" : "");
      if (i === 0) el.dataset.dir = this.direction;
      el.style.cssText = `position:absolute;left:${part.col * cs}px;top:${part.row * cs}px;width:${cs}px;height:${cs}px;`;
      this.container.appendChild(el);
    });

    // Pomme
    if (this._appleEl) this._appleEl.remove();
    this._appleEl = document.createElement("div");
    this._appleEl.className =
      "apple" + (this.apple.isGolden ? " golden-apple" : "");
    this._appleEl.style.cssText = `position:absolute;left:${this.apple.col * cs}px;top:${this.apple.row * cs}px;width:${cs}px;height:${cs}px;`;
    this.container.appendChild(this._appleEl);

    // Bonus pickup
    if (this._bonusEl) {
      this._bonusEl.remove();
      this._bonusEl = null;
    }
    if (this.bonus) {
      this._bonusEl = document.createElement("div");
      this._bonusEl.className = `bonus-pickup ${this.bonus.cssClass}`;
      this._bonusEl.textContent = this.bonus.label;
      this._bonusEl.style.cssText = `position:absolute;left:${this.bonus.col * cs}px;top:${this.bonus.row * cs}px;width:${cs}px;height:${cs}px;`;
      this.container.appendChild(this._bonusEl);
    }
  }
}
