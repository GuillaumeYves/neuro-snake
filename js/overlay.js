import { overlayEl, overlayTitle, overlaySub } from "./dom.js";

export function showOverlay(title, subtitle, titleStyle = "") {
  overlayTitle.textContent = title;
  overlayTitle.className = "overlay-title" + (titleStyle ? " " + titleStyle : "");
  overlaySub.innerHTML = subtitle;
  overlayEl.classList.add("visible");
}

export function hideOverlay() {
  overlayEl.classList.remove("visible");
}
