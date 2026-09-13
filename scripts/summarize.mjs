import fs from "fs";

try {
    let summary = "Système opérationnel - Surveillance des flux en cours...";

    if (fs.existsSync("data/clusters.json")) {
        try {
            const clusters = JSON.parse(fs.readFileSync("data/clusters.json", "utf-8"));
            
            if (Array.isArray(clusters) && clusters.length > 0) {
                // Tri par score et extraction des 5 clusters les plus importants
                const topClusters = clusters
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5);

                // Nettoyage intelligent : on extrait uniquement le sujet principal pour éviter les répétitions
                const subjects = topClusters.map(c => {
                    let title = c.title || "";
                    // Suppression des préfixes polluants
                    title = title.replace(/\[CYBER\]/gi, "")
                                 .replace(/Point de situation critique concernant :/gi, "")
                                 .trim();
                    
                    // On ne garde que la partie avant les deux-points (le sujet principal)
                    // Si pas de deux-points, on garde le titre entier
                    return title.split(":")[0].trim();
                });

                // Utilisation d'un Set pour éliminer les doublons de sujets (ex: éviter d'avoir "Syrie" plusieurs fois)
                const uniqueSubjects = [...new Set(subjects)];
                
                // Construction du résumé final
                summary = `VEILLE : ${uniqueSubjects.join(" | ")}`;
            }
        } catch (e) {
            console.warn("Attention: Erreur lors du traitement des clusters, utilisation d'un résumé de secours.");
        }
    } else {
        console.warn("Attention: clusters.json non trouvé, génération d'un résumé de repli.");
    }

    fs.mkdirSync("data", { recursive: true });
    
    // Création du payload avec horodatage pour forcer Git à détecter le changement
    const payload = {
        updated: new Date().toISOString(),
        summary: summary
    };

    fs.writeFileSync("data/summary.json", JSON.stringify(payload, null, 2));
    console.log("✔ summary.json généré et nettoyé avec succès :", summary);
} catch (e) {
    console.error("ERREUR lors de la génération du résumé:", e.message);
    process.exit(1);
}
