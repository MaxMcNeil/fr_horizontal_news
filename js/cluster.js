export function sortByScore(items) {
  return [...items].sort((a, b) => b.score - a.score);
}
