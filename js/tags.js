export function getTags(text = "") {
  const t = text.toUpperCase();

  const tags = [];

  if (/(MEURTRE|ASSASSIN|VIOL|FUSILLADE|CRIME)/.test(t)) {
    tags.push("CRIME");
  }

  if (/(FOOT|COUPE DU MONDE|LIGUE|MATCH)/.test(t)) {
    tags.push("SPORT");
  }

  if (/(GOUVERN|POLICE|MINISTRE|ÉLECTION|PARLEMENT)/.test(t)) {
    tags.push("POLITIQUE");
  }

  if (/(UKRAINE|GUERRE|RUSSIE|ISRAEL|GAZA)/.test(t)) {
    tags.push("GÉOPOLITIQUE");
  }

  return tags.length ? tags : ["INFO"];
}
