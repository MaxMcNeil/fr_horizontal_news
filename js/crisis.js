export function isCrisis(item) {
  if (!item) return false;

  const score = item.score || 0;
  const hasGeo = !!(item.lat && item.lon);
  const isHot = score >= 80;

  // Déclenchement de crise si score élevé critique ou si géolocalisé avec haute gravité
  return isHot && (hasGeo || score >= 90);
}
