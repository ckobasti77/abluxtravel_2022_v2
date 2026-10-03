// Display cleanup for partner itinerary days (offer page). Some partners repeat
// the day number inside the title ("1.dan BEOGRAD") and start the body with a
// "dan" / "1" badge rendered as paragraphs; the page already shows "Dan 1".

const TITLE_PREFIX = /^\s*(\d{1,2})\s*\.?\s*dan\b[\s.:,–—-]*/i;
const BADGE_LEAD = /^(\s*<p>\s*)*\s*<p>\s*dan\s*<\/p>\s*<p>\s*\d{1,2}\.?\s*<\/p>/i;

export function programDayTitle(day: { day?: number | null; title: string }): string {
  const match = day.title.match(TITLE_PREFIX);
  if (!match || !day.day || Number(match[1]) !== day.day) return day.title;
  const rest = day.title.slice(match[0].length).trim();
  return rest || day.title;
}

export function programDayHtml(html: string): string {
  const cleaned = html.replace(BADGE_LEAD, (lead) => lead.replace(/<p>\s*dan\s*<\/p>\s*<p>\s*\d{1,2}\.?\s*<\/p>/i, ""));
  return cleaned;
}
