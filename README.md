# Snake-IT-DFS34A

Fork du projet original [Snake-IT-DFS34A](https://github.com/tomDeprez/Snake-IT-DFS34A) de [@tomDeprez](https://github.com/tomDeprez).

## Ce qui a changé

Cette version est un refactor complet du projet original. L'objectif était de partir d'une base fonctionnelle et d'évoluer vers une architecture plus propre, maintenable et scalable.

**Architecture JS**
Le fichier `main.js` monolithique a été découpé en modules ES avec une responsabilité unique chacun : `config`, `state`, `dom`, `game`, `snake`, `apple`, `bonus`, `collision`, `score`, `sound`, `input`, `overlay`, `responsive`.

**SCSS via npm**
Le CSS a été migré vers SCSS avec un partial par composant (`_snake.scss`, `_apple.scss`, `_bonus.scss`, etc.), tous importés dans un fichier `styles.scss` central. La compilation se fait via `sass` installé en dev dependency.

```bash
npm install         # installe les dépendances (dont sass pour compiler le scss)
npm run build:css   # compile une fois
npm run watch:css   # recompile à chaque modification (laisser le terminal ouvert avec la commande)
```

**Fonctionnalités ajoutées**

- Système de bonus pickup (X2, X3, X5)
- Pommes classiques (+1 point)
- Pommes dorées (+10 points, + rares)
- Sons 8-bit génératifs via Web Audio API
- Jeu globalement plus animé via css

## Lancer le projet

```bash
npm install
npm run build:css # (au moins une fois avant le lancement)
# Ouvrir game.html
```
