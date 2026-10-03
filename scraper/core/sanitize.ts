// Allowlist sanitizer for partner HTML (Node). Output is stored and later
// rendered with dangerouslySetInnerHTML, so it must be strict.
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h3", "h4", "h5", "table", "thead", "tbody", "tr", "th", "td", "blockquote"],
  allowedAttributes: { td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] },
  allowedSchemes: [],
  transformTags: {
    h1: "h3",
    h2: "h3",
    h6: "h5",
    div: "p",
    section: "p",
    article: "p",
  },
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "svg", "button", "form", "select"],
  exclusiveFilter: (frame) => ["p", "li", "strong", "b", "em", "i", "u", "h3", "h4", "h5"].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren?.length,
};

export function sanitizeFragment(html: string | undefined, maxLength = 60_000): string | undefined {
  if (!html) return undefined;
  let clean = sanitizeHtml(html, OPTIONS)
    .replace(/(&nbsp;| )+/g, " ")
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/(<br\s*\/?>\s*){3,}/g, "<br><br>")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Nested <p> from transformed divs: flatten.
  clean = clean.replace(/<p>\s*<p>/g, "<p>").replace(/<\/p>\s*<\/p>/g, "</p>");
  if (!clean) return undefined;
  if (clean.length > maxLength) {
    const cut = clean.lastIndexOf("</p>", maxLength);
    clean = cut > 0 ? clean.slice(0, cut + 4) : sanitizeHtml(clean.slice(0, maxLength), OPTIONS);
  }
  return clean;
}

/** Plain text of an HTML fragment (for list items and titles). */
export function htmlToText(html: string | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li|div|h\d)>/gi, "\n"), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .trim();
}
