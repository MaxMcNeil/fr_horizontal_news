import axios from "axios";
import Parser from "rss-parser";
import { cleanEncoding, readNewsData, writeNewsData, isCyberItem, MAX_AGE_MS, translateText } from "./utils.mjs";

// timeout: 8s max par requête HTTP sous-jacente (évite qu'un flux mort ne bloque tout)
const parser = new Parser({ timeout: 8000 });
const RANSOM_LIVE_API = "https://api.ransomware.live/recent";

const INTERNATIONAL_CYBER_FEEDS = [
    "https://feeds.feedburner.com/TheHackersNews",
    "https://bleepingcomputer.com/feed/",
    "https://cyberpress.org/category/data-breach/",
    "https://cyberpress.org/category/cyber-attack/"
];

// Sources cyber françaises dédiées : déjà centrées sur la France, traitées à part (forceAll)
const FRENCH_CYBER_FEEDS = [
    "https://www.zataz.com/feed/",
    "https://www.cert.ssi.gouv.fr/feed/",
    "https://www.lemondeinformatique.fr/flux-rss/thematique/securite/rss.xml"
];

const FRENCH_CONTEXT_KEYWORDS = [
    "FRANCE", "FRENCH", "PARIS", "EUROPE", "EU", "NATO", "OTAN", 
    "GLOBAL", "CRITICAL", "VULNERABILITY", "ZERO-DAY", "MICROSOFT", 
    "GOOGLE", "APPLE", "ANSSI", "CERT-FR", "ORANGE", "THALES", 
    "AIRBUS", "EDF", "TOTAL", "MACRON", "BARNIER"
];

function isFrenchTarget(text) {
    if (!text) return false;
    const upper = text.toUpperCase();
    return FRENCH_CONTEXT_KEYWORDS.some(keyword => upper.includes(keyword));
}

async function fetchInternationalFeed(url, forceAll = false) {
    try {
        const feed = await parser.parseURL(url);
        let filtered = (feed.items || []).filter(
            i => forceAll || isFrenchTarget(i.title) || isFrenchTarget(i.contentSnippet || i.summary)
        );

        // Max 10 articles les plus récents pour plus de volume
        filtered = filtered.slice(0, 10);

        let sourceName = "CyberPress";
        if (url.includes("thehackernews")) sourceName = "The Hacker News";
        else if (url.includes("bleepingcomputer")) sourceName = "BleepingComputer";
        else if (url.includes("zataz")) sourceName = "Zataz";
        else if (url.includes("cert.ssi.gouv.fr")) sourceName = "CERT-FR";
        else if (url.includes("lemondeinformatique")) sourceName = "Le Monde Informatique";

        const mapped = [];
        // Traitement SÉQUENTIEL : évite d'exploser la mémoire vive et le processeur de l'IA locale
        for (const i of filtered) {
            const rawTitle = i.title || "";
            let translatedTitle = rawTitle;
            try {
                translatedTitle = await translateText(rawTitle);
            } catch (err) {
                // Si l'IA met du temps ou échoue, conservation du titre original
            }
            
            mapped.push({
                title: cleanEncoding(`[CYBER${forceAll ? "" : " INT"}] ${translatedTitle}`),
                source: sourceName,
                time: i.pubDate ? new Date(i.pubDate).toISOString() : new Date().toISOString(),
                link: i.link || i.guid || "",
                score: forceAll ? 90 : 88
            });
        }

        return mapped;
    } catch (e) {
        return [];
    }
}

async function fetchRansomwareLive() {
    let results = [];
    try {
        const resp = await axios.get(RANSOM_LIVE_API, { timeout: 5000 });
        results = Array.isArray(resp.data) ? resp.data : (resp.data?.attacks || []);
    } catch (e) {}

    let targetPosts = results.filter(item => {
        const content = `${item.company || ""} ${item.country || ""} ${item.post_title || ""}`;
        return content.toUpperCase().includes("FRANCE") || item.country === "FR";
    });

    targetPosts = targetPosts.slice(0, 15);

    const mapped = [];
    for (const post of targetPosts) {
        const rawInfo = post.company || post.post_title || "Cible française";
        let translatedInfo = rawInfo;
        try {
            translatedInfo = await translateText(rawInfo);
        } catch (err) {}

        mapped.push({
            title: cleanEncoding(`[CYBER] Rançon-live (${post.group_name || "Leak"}) : ${translatedInfo}`),
            source: "Ransomware.live",
            time: post.discovered || new Date().toISOString(),
            link: post.website || post.post_url || "https://www.ransomware.live/",
            score: 96
        });
    }

    return mapped;
}

async function run() {
    try {
        const now = Date.now();
        const currentData = readNewsData();

        const existingNews = (currentData.items || []).filter(
            i => !isCyberItem(i) && now - new Date(i.time).getTime() < MAX_AGE_MS
        );
        const existingCyber = (currentData.items || []).filter(
            i => isCyberItem(i) && now - new Date(i.time).getTime() < MAX_AGE_MS
        );

        let newCyberItems = await fetchRansomwareLive();

        // Sources françaises dédiées : tous les articles sont pertinents (forceAll)
        for (const url of FRENCH_CYBER_FEEDS) {
            const items = await fetchInternationalFeed(url, true);
            newCyberItems = newCyberItems.concat(items);
        }

        for (const url of INTERNATIONAL_CYBER_FEEDS) {
            const items = await fetchInternationalFeed(url, false);
            newCyberItems = newCyberItems.concat(items);
        }

        if (newCyberItems.length < 5) {
            for (const url of INTERNATIONAL_CYBER_FEEDS) {
                const extra = await fetchInternationalFeed(url, true);
                newCyberItems = [...newCyberItems, ...extra];
            }
        }

        const allCyber = [...new Map([...existingCyber, ...newCyberItems].map(i => [i.link, i])).values()]
            .filter(i => now - new Date(i.time).getTime() < MAX_AGE_MS)
            .sort((a, b) => b.score - a.score)
            .slice(0, 70);

        const finalItems = [...existingNews, ...allCyber].sort((a, b) => b.score - a.score);
        writeNewsData(finalItems);
        console.log(`✔ Flux cyber mis à jour et traduit en parallèle (${allCyber.length} items).`);
        
        // SÉCURITÉ CRITIQUE : Tue proprement le processus pour empêcher GitHub de freezer
        process.exit(0);
    } catch (criticalError) {
        console.error("Erreur critique d'exécution:", criticalError);
        process.exit(1);
    }
}

run();
            
