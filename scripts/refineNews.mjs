import { cleanEncoding, readNewsData, writeNewsData, MAX_AGE_MS } from "./utils.mjs";

function smartRefine(item, allItems) {
    let title = cleanEncoding(item.title || "");
    let summary = cleanEncoding(item.summary || "");
    let score = item.score;

    // 1. Correction si le résumé est identique au titre (ou vide)
    if (!summary || summary.trim() === title.trim()) {
        if (title.includes(" : ")) {
            summary = title.split(" : ")[1];
        } else if (title.includes(" — ")) {
            summary = title.split(" — ")[1];
        } else {
            summary = `Point de situation critique concernant : ${title.substring(0, 80)}...`;
        }
    }

    // 2. Intelligence factuelle pour l'affaire de Monaco (ID 5 & 6 / Suspecte retrouvée morte)
    const isMonacoExplosion = title.toUpperCase().includes("MONACO") || summary.toUpperCase().includes("MONACO");
    const isSuspectDead = title.toUpperCase().includes("MORT") || title.toUpperCase().includes("RETROUVÉE MORTE") || summary.toUpperCase().includes("MORTE");

    if (isMonacoExplosion && isSuspectDead) {
        summary = summary.replace(/Recherchée par Interpol[,]?/gi, "").replace(/mandat d'arrêt international/gi, "l'enquête sur l'attentat");
        score = Math.max(score, 95);
    }

    return {
        ...item,
        title: title,
        summary: summary.trim(),
        score: score
    };
}

async function run() {
    const data = readNewsData();
    if (!data.items || data.items.length === 0) {
        console.log("Aucun fichier ou élément news.json trouvé à raffiner.");
        return;
    }

    const now = new Date().getTime();
    
    // Correction : Sécurité de parsing de date et fallback si i.time est invalide
    let items = (data.items || []).filter(i => {
        let itemTime = new Date(i.time).getTime();
        
        // Si la date est invalide (NaN), on essaie de l'accepter par défaut ou on prend l'heure actuelle
        if (isNaN(itemTime)) {
            console.warn(`Date invalide détectée pour l'article: "${i.title}". Remplacement temporaire.`);
            return true; // Ne pas supprimer bêtement si la date est mal formatée
        }
        
        return (now - itemTime < MAX_AGE_MS);
    });

    // Si après le filtre strict il ne reste rien mais qu'on avait des données, 
    // on désactive temporairement le filtre de 24h pour ne pas planter le live OBS
    if (items.length === 0 && data.items.length > 0) {
        console.warn("⚠️ Attention : Le filtre 24h a vidé la liste. Récupération de secours des derniers items bruts.");
        items = data.items;
    }

    // Application du raffinement intelligent sur chaque item restant
    items = items.map(item => smartRefine(item, items));

    // Déduplication finale et respect des critères de score >= 65
    let all = [...new Map(items.map(i => [i.link, i])).values()]
        .filter(i => i.score >= 65)
        .sort((a, b) => b.score - a.score);

    const final = all.slice(0, 150);

    // Utilisation de la fonction unifiée d'écriture
    writeNewsData(final);
    console.log("✔ Raffinement sémantique et filtrage 24h appliqués :", final.length, "éléments conservés.");
}

run();
