const container = document.getElementById("newsContainer");
const counter = document.getElementById("counter");

let ALL_ITEMS = []; // Stocke TOUTES les actus de la timeline
let DATA = [];      // La news actuellement affichée à l'écran (1 seule à la fois)
const VISIBLE_COUNT = 1; // Une seule news à l'écran, occupe tout le reste de l'écran

// Gestion du bip audio sécurisé pour OBS / Navigateur
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playBip() {
    try {
        initAudio();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
        // Silencieux si bloqué sans interaction
    }
}

function formatTime(iso) {
    const d = new Date(iso);
    return isNaN(d) ? "--:--" : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function getCleanSource(source) {
    if (!source) return "RSS";
    if (source.includes("ransomlook")) return "CYBER";
    return source.split('/').pop().replace(".xml", "").replace(".rss", "") || "RSS";
}

// Affiche l'unique news courante, en plein format (tout le reste de l'écran)
function render() {
    container.innerHTML = "";
    const item = DATA[0];
    if (item) {
        const card = document.createElement("div");
        card.className = "newsCardMain";
        card.style.borderLeftColor = item.score >= 90 ? "var(--accent-red)" : (item.score >= 70 ? "var(--accent-orange)" : "var(--accent-yellow)");
        card.innerHTML = `<div class="newsTitle">${item.title}</div><div class="newsInfos"><span>${getCleanSource(item.source)}</span><span>⚡ ${item.score}</span><span>HEURE : ${formatTime(item.time)}</span></div>`;
        container.appendChild(card);
    }

    if (counter) counter.textContent = `[${ALL_ITEMS.length}]`;
}

// Fait tourner la grande liste complète : la news suivante prend toute la place à l'écran
function rotateNews() {
    if (ALL_ITEMS.length > 1) {
        const last = ALL_ITEMS.pop();
        ALL_ITEMS.unshift(last);
        DATA = ALL_ITEMS.slice(0, VISIBLE_COUNT);
        playBip();
        render();
    }
}

async function load() {
    try {
        const res = await fetch("data/news.json?v=" + Date.now(), { cache: "no-store" });
        const json = await res.json();
        ALL_ITEMS = json.items || [];
        DATA = ALL_ITEMS.slice(0, VISIBLE_COUNT);
        render();
    } catch (e) { console.error("NEWS ERROR", e); }
}

const popupEl = document.getElementById("criticalPopup");
const textEl = document.getElementById("criticalText");

// Déclenche l'affichage du pop-up de l'alerte la plus négative du lot en cours, couvre tout le reste de l'écran
function triggerCriticalAlert() {
    if (!ALL_ITEMS || ALL_ITEMS.length === 0) return;

    // Trouve l'élément avec le score le plus haut (le plus critique/négatif) parmi les news récentes
    const pool = ALL_ITEMS.slice(0, 10);
    const mostNegative = [...pool].sort((a, b) => b.score - a.score)[0];

    if (mostNegative && textEl) {
        textEl.textContent = mostNegative.title;
    }

    if (popupEl) popupEl.classList.remove("hidden");
    playBip();

    // Cache le pop-up après 12 secondes
    setTimeout(() => {
        if (popupEl) popupEl.classList.add("hidden");
    }, 12000);
}

// Planifie le déclenchement toutes les 2 minutes (120 000 ms) — de temps en temps
setInterval(triggerCriticalAlert, 120000);

load();
setInterval(load, 60000);
setInterval(rotateNews, 15000); // Chaque news reste affichée 15 secondes
