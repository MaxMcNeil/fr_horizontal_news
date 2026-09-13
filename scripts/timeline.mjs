import fs from "fs";

try {
    if (!fs.existsSync("data/clusters.json")) {
        console.log("✔ timeline: 0 (clusters.json absent)");
        process.exit(0);
    }

    const rawClusters = fs.readFileSync("data/clusters.json", "utf-8");
    const clusters = JSON.parse(rawClusters);

    if (!Array.isArray(clusters) || clusters.length === 0) {
        console.log("✔ timeline ignorée : clusters.json est vide.");
        process.exit(0);
    }

    const timeline = clusters
    .sort((a,b)=>b.score - a.score)
    .map((c,i)=>({
        id: i,
        title: c.title,
        score: c.score,
        summary: c.summary,
        count: c.count,
        time: new Date().toISOString()
    }));

    fs.writeFileSync("data/timeline.json", JSON.stringify(timeline, null, 2));
    console.log("✔ timeline:", timeline.length);
} catch (e) {
    console.error("ERREUR timeline:", e.message);
    process.exit(1);
}
