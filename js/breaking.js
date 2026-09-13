export function analyzeNews(items) {
  if (!Array.isArray(items)) return [];

  const TAGS = {
    crime: ["MEURTRE", "ASSASSIN", "VIOL", "FUSILLADE", "ATTENTAT", "BRAQUAGE", "NARCOTRAFIC", "HOMICIDE"],
    politics: ["GOUVERNEMENT", "MINISTRE", "ÉLECTION", "PRÉSIDENT", "SÉNAT", "POLICE", "DÉMISSION", "MACRON"],
    cyber: ["[CYBER]", "RANSOM", "CYBER", "ATTAQUE", "RANÇONGICIEL", "VULNÉRABILITÉ"],
    sport: ["FOOT", "MATCH", "COUPE", "LIGUE", "FIFA", "OLYMPIQUE"]
  };

  function getTag(text) {
    const t = (text || "").toUpperCase();

    for (const [tag, words] of Object.entries(TAGS)) {
      if (words.some(w => t.includes(w))) return tag;
    }

    return "info";
  }

  return items.map(n => ({
    ...n,
    tag: getTag(n.title),
    crisis: (n.score || 0) >= 85
  }));
}
