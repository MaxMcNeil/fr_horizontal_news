export async function fetchNews() {
  try {
    const res = await fetch("data/news.json?v=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("Erreur de chargement du flux d'actualités.");
    const json = await res.json();
    return json.items || [];
  } catch (e) {
    console.error("RSS ERROR:", e);
    return [];
  }
}
