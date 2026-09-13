export function pulse(el, score) {
  if (!el) return;

  if (score >= 90) {
    el.style.animation = "pulseRed 1s infinite";
  } else if (score >= 80) {
    el.style.animation = "pulseOrange 2s infinite";
  }
}
