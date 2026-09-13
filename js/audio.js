const beepSound = new Audio('assets/sounds/beep.mp3');
const criticalSound = new Audio('assets/sounds/critical.mp3');

export function playBeep() {
  beepSound.currentTime = 0;
  beepSound.play().catch(() => {}); // Gère les restrictions de lecture automatique du navigateur
}

export function playCritical() {
  criticalSound.currentTime = 0;
  criticalSound.play().catch(() => {});
}
