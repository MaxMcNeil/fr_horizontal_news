export function summarize(title) {
  if (!title) return "";

  // 🔥 Nettoyage intelligent : on enlève les balises et les séparateurs polluants
  const clean = title
    .replace(/\[CYBER\]/gi, "")
    .replace(/Point de situation critique concernant :/gi, "")
    .replace(/[:\-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = clean.split(" ");

  // Résumé simple : 10 mots max + ellipse si nécessaire
  return words.slice(0, 10).join(" ") + (words.length > 10 ? "…" : "");
}
