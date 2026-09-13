export function buildTimeline(items) {
  return items
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10);
}
