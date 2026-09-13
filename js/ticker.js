export function buildTicker(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "⚠ Système opérationnel - Surveillance des flux en cours...";
  }

  return items
    .slice(0, 20)
    .map(n => `⚠ ${n.title ? n.title.replace(/\[CYBER\]/gi, "CYBER :") : "Alerte"}`)
    .join(" | ");
}
