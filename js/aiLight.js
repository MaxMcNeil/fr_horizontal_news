export function analyzeText(text = "") {
  const t = text.toUpperCase();
  let tag = "VEILLE";
  let summary = text;

  // TAGS ÉLARGIS
  if (t.match(/MEURTRE|ASSASSINAT|VIOL|AGRESSION|HOMICIDE/)) {
    tag = "CRIME";
  } else if (t.match(/POLICE|GENDARMERIE|ENQUÊTE|JUSTICE|TRIBUNAL/)) {
    tag = "SÉCURITÉ";
  } else if (t.match(/GOUVERN|MINISTRE|ÉLECTION|LOI|PARLEMENT|DÉPUTÉ/)) {
    tag = "POLITIQUE";
  } else if (t.match(/GUERRE|UKRAINE|RUSSIE|NATO|OTAN/)) {
    tag = "GÉOPOLITIQUE";
  } else if (t.match(/ÉCONOMIE|BOURSE|INFLATION|FAILLITE|BANQUE/)) {
    tag = "FINANCE";
  } else if (t.match(/CLIMAT|ÉCOLOGIE|ÉNERGIE/)) {
    tag = "ENVIRONNEMENT";
  } else if (t.match(/FOOT|COUPE DU MONDE|LIGUE|SPORT/)) {
    tag = "SPORT";
  }

  // MINI SUMMARY
  summary = text
    .replace(/["«»]/g, "")
    .split(" ")
    .slice(0, 14)
    .join(" ");

  return { tag, summary };
}
