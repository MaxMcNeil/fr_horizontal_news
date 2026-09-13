import fs from "fs";
import path from "path";
import os from "os";
import { pipeline, env } from "@xenova/transformers"; // Import de l'IA locale et de son environnement

// 🚀 Configuration du dossier de cache sous GitHub Actions
const CACHE_DIR = "/home/runner/.cache/huggingface";
env.allowLocalFiles = true;   
env.allowRemoteFiles = true;  
env.cacheDir = CACHE_DIR;

export const TARGET_FILE = "data/news.json";
export const MAX_AGE_MS = 48 * 60 * 60 * 1000;

// Variable pour stocker le traducteur une fois chargé en mémoire
let translatorInstance = null;

export function cleanEncoding(str) {
    if (!str) return "";
    return str
        .normalize("NFC")
        .replace(/\uFFFD/g, "é");
}

export function readNewsData() {
    if (!fs.existsSync(TARGET_FILE)) return { items: [] };
    try {
        return JSON.parse(fs.readFileSync(TARGET_FILE, "utf-8"));
    } catch (e) {
        return { items: [] };
    }
}

export function writeNewsData(items) {
    fs.mkdirSync("data", { recursive: true });
    const output = {
        updated: new Date().toISOString(),
        count: items.length,
        items: items
    };
    fs.writeFileSync(TARGET_FILE, JSON.stringify(output, null, 2));
}

export function isCyberItem(item) {
    return (
        item.source === "CERT-FR" ||
        item.source === "Zataz" ||
        item.source === "Le Monde Informatique" ||
        item.source === "Ransomlook.io" ||
        (item.title || "").startsWith("[CYBER]")
    );
}

// Fonction de traduction 100% AUTONOME, LOCALE et FIABLE (Meta NLLB)
export async function translateText(text) {
    if (!text) return "";
    try {
        // Initialisation du modèle Meta NLLB (Robuste, sans fichiers manquants)
        if (!translatorInstance) {
            translatorInstance = await pipeline('translation', 'Xenova/nllb-200-distilled-600M', {
                cache_dir: CACHE_DIR,
                local_files_only: false
            });
        }

        // Traduction de l'anglais (eng_Latn) vers le français (fra_Latn) via les codes NLLB
        const output = await translatorInstance(text, {
            src_lang: 'eng_Latn',
            tgt_lang: 'fra_Latn',
        });

        if (output && output[0] && output[0].translation_text) {
            return cleanEncoding(output[0].translation_text);
        }
        return text;
    } catch (e) {
        console.log(`[Traduction Locale] Erreur ou repli sur le texte original : ${e.message}`);
        return text;
    }
}
