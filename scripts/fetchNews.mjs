import Parser from "rss-parser";
import { cleanEncoding, readNewsData, writeNewsData, isCyberItem, MAX_AGE_MS } from "./utils.mjs";

// timeout: 8s max par requête HTTP sous-jacente (évite qu'un flux mort ne bloque tout)
const parser = new Parser({ timeout: 8000 });
const FEED_TIMEOUT_MS = 10000; // garde-fou supplémentaire côté script

const RSS_FEEDS = [
    // Faits divers / justice / police
    "https://feeds.leparisien.fr/leparisien/rss/faits-divers",
    "https://www.lemonde.fr/justice/rss_full.xml",
    "https://www.lemonde.fr/police/rss_full.xml",
    "https://www.lemonde.fr/societe/rss_full.xml",
    "https://www.franceinfo.fr/faits-divers.rss",
    "https://www.sudouest.fr/faits-divers/rss.xml",
    "https://www.ledauphine.com/Faits-divers-Justice/rss",
    "https://www.cnews.fr/rss/categorie/faits%20divers",
    "https://rmccrime.bfmtv.com/rss/affaires-criminelles/france/",
    "https://rmccrime.bfmtv.com/rss/affaires-criminelles/",
    // Politique / scandales
    "https://www.mediapart.fr/articles/feed",
    "https://www.marianne.net/rss.xml",
    "https://www.lemonde.fr/politique/rss_full.xml",
    "https://www.francetvinfo.fr/politique.rss",
    "https://www.bfmtv.com/rss/politique/",
    // Économie / finances / affaires
    "https://www.lemonde.fr/economie/rss_full.xml",
    "https://www.capital.fr/rss",
    "https://www.challenges.fr/rss.xml",
    "https://www.bfmtv.com/rss/economie/",
    // Généralistes (en secours, filtrées ci-dessous)
    "https://www.lefigaro.fr/rss/figaro_actualites.xml",
    "https://www.20minutes.fr/feeds/rss-une.xml",
    "https://www.leparisien.fr/actualites-a-la-une/rss.xml"
];

// Mots-clés "choc" prioritaires : scandales politiques/financiers
const SCANDAL_KEYWORDS = [
    "SCANDALE", "CORRUPTION", "FRAUDE", "DÉTOURNEMENT", "ESCROQUERIE",
    "BLANCHIMENT", "PERQUISITION", "MISE EN EXAMEN", "GARDE À VUE",
    "POT-DE-VIN", "ABUS DE BIENS SOCIAUX", "ÉVASION FISCALE", "PARADIS FISCAL",
    "FAVORITISME", "PRISE ILLÉGALE D'INTÉRÊTS", "PARQUET NATIONAL FINANCIER",
    "INCULPÉ", "CONDAMNÉ", "DÉTENTION PROVISOIRE", "PLACÉ EN EXAMEN",
    "DÉMISSION", "MOTION DE CENSURE", "FAILLITE", "REDRESSEMENT JUDICIAIRE",
    "LICENCIEMENTS", "PLAN SOCIAL"
];

// Mots-clés faits divers / violence
const FAITS_DIVERS_KEYWORDS = [
    "MEURTRE", "ASSASSINAT", "HOMICIDE", "AGRESSION", "BRAQUAGE",
    "FUSILLADE", "VIOLENCE", "DISPARITION", "ENLÈVEMENT", "VIOL",
    "TRAFIC DE DROGUE", "NARCOTRAFIC", "CARTEL", "RÈGLEMENT DE COMPTES",
    "INCENDIE CRIMINEL", "ATTENTAT", "EXPLOSION", "ÉMEUTE", "TUÉ", "TUÉE",
    "RETROUVÉ MORT", "RETROUVÉE MORTE"
];

// Mots-clés piratage / rançongiciel (en plus de fetchCyber.mjs)
const CYBER_KEYWORDS = [
    "PIRATAGE", "PIRATÉ", "RANÇON", "RANÇONGICIEL", "RANSOMWARE",
    "CYBERATTAQUE", "FUITE DE DONNÉES", "DONNÉES VOLÉES", "HACKÉ", "HACKEUR"
];

// Actualité internationale généraliste (guerre etc.) : dépriorisée si aucun lien avec la France
const FOREIGN_GENERIC_KEYWORDS = [
    "GUERRE", "MOYEN-ORIENT", "IRAN", "ISRAËL", "GAZA", "UKRAINE",
    "RUSSIE", "OTAN", "HOUTHIS", "CHINE", "TAÏWAN"
];

const FRANCE_CONTEXT_KEYWORDS = [
    "FRANCE", "FRANÇAIS", "FRANÇAISE", "PARIS", "MACRON", "MATIGNON",
    "ELYSÉE", "ASSEMBLÉE NATIONALE", "SÉNAT", "MINISTRE", "DÉPUTÉ",
    "MAIRE", "PRÉFET", "GOUVERNEMENT"
];

function getScore(title) {
    const t = (title || "").toUpperCase();

    if (SCANDAL_KEYWORDS.some(k => t.includes(k))) return 97;
    if (CYBER_KEYWORDS.some(k => t.includes(k))) return 93;
    if (FAITS_DIVERS_KEYWORDS.some(k => t.includes(k))) return 90;

    const isForeignGeneric = FOREIGN_GENERIC_KEYWORDS.some(k => t.includes(k));
    const hasFranceContext = FRANCE_CONTEXT_KEYWORDS.some(k => t.includes(k));
    if (isForeignGeneric && !hasFranceContext) return 40; // filtré ensuite par refineNews (seuil 65)

    return 72; // Score de base suffisant pour passer le filtre >= 65 de refineNews
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve([]), ms))
    ]);
}

async function fetchRSS(url) {
    try {
        const feed = await parser.parseURL(url);
        return feed.items.map(i => ({
            title: cleanEncoding(i.title || ""),
            source: url,
            time: i.pubDate ? new Date(i.pubDate).toISOString() : new Date().toISOString(),
            link: i.link || "",
            score: getScore(i.title || "")
        }));
    } catch (e) {
        return [];
    }
}

async function run() {
    const now = Date.now();
    const currentData = readNewsData();

    // Conserver les actus non-cyber valides
    const existingNews = (currentData.items || []).filter(
        i => !isCyberItem(i) && now - new Date(i.time).getTime() < MAX_AGE_MS
    );
    const existingCyber = (currentData.items || []).filter(
        i => isCyberItem(i) && now - new Date(i.time).getTime() < MAX_AGE_MS
    );

    // Traitement EN PARALLÈLE : chaque flux est borné à FEED_TIMEOUT_MS,
    // un flux lent ou mort ne peut plus bloquer les 21 autres.
    const results = await Promise.all(
        RSS_FEEDS.map(url => withTimeout(fetchRSS(url), FEED_TIMEOUT_MS))
    );
    let newItems = results.flat();

    // 🛡️ SÉCURITÉ : Si le réseau a échoué (0 nouveau), on garde l'existant sans le décimer
    if (newItems.length === 0 && existingNews.length > 0) {
        console.warn("⚠️ Fetch général vide, conservation de l'historique de secours.");
        newItems = existingNews;
    }

    const allNews = [...new Map([...existingNews, ...newItems].map(i => [i.link, i])).values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, 90);

    const finalItems = [...allNews, ...existingCyber].sort((a, b) => b.score - a.score);
    writeNewsData(finalItems);
    console.log("✔ Flux actualités générales mis à jour.");

    // SÉCURITÉ CRITIQUE : Tue proprement le processus pour empêcher GitHub de freezer
    // (des sockets de flux lents peuvent rester ouverts en arrière-plan sinon)
    process.exit(0);
}

run();
