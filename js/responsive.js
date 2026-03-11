const gameWrapper = document.getElementById("game-wrapper");

// Dimensions naturelles du wrapper en pixels (sans aucun zoom)
const WRAPPER_WIDTH = 800;
const WRAPPER_HEIGHT = 800;
const SIDE_PADDING = 24;
const TOP_BOT_PADDING = 80;

function updateScale() {
  const availableWidth = window.innerWidth - SIDE_PADDING;
  const availableHeight = window.innerHeight - TOP_BOT_PADDING;

  // On calcule le ratio pour que le jeu rentre dans l'écran, sans jamais dépasser 1 (pas de zoom)
  const scale = Math.min(
    1,
    availableWidth / WRAPPER_WIDTH,
    availableHeight / WRAPPER_HEIGHT,
  );

  document.documentElement.style.setProperty("--game-scale", scale);

  // Sans ce margin négatif le wrapper réduit occupe toujours sa hauteur d'origine et crée un vide
  const unusedHeight = WRAPPER_HEIGHT * (1 - scale);
  gameWrapper.style.marginBottom = `-${unusedHeight}px`;
}

updateScale();
window.addEventListener("resize", updateScale);
