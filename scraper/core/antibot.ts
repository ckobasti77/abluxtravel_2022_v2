// Anti-bot / challenge page detection by content (night rule 5). A detected
// page is never parsed or stored; the run item becomes "blocked".

export type AntiBotHit = { vendor: string; reason: string };

const MARKERS: { vendor: string; pattern: RegExp; reason: string }[] = [
  { vendor: "imunify360", pattern: /wsidchk/i, reason: "Zaštitna stranica (wsidchk)." },
  { vendor: "imunify360", pattern: /<title>\s*One moment, please/i, reason: "Zaštitna stranica (One moment, please)." },
  {
    vendor: "imunify360",
    pattern: /Please wait while your request is being verified/i,
    reason: "Zaštitna stranica (provera zahteva).",
  },
  { vendor: "imunify360", pattern: /\/z0f76a1d14fd21a8fb5fd0d03e0fdc3d3cedae52f/, reason: "Zaštitna stranica (challenge forma)." },
  { vendor: "cloudflare", pattern: /<title>\s*Just a moment\.\.\./i, reason: "Cloudflare provera (Just a moment)." },
  { vendor: "cloudflare", pattern: /challenge-platform|cf-chl-/i, reason: "Cloudflare challenge." },
  { vendor: "cloudflare", pattern: /Attention Required! \| Cloudflare/i, reason: "Cloudflare blokada." },
];

export function detectAntiBot(
  body: string,
  headers: Record<string, string> = {},
  _status = 200
): AntiBotHit | null {
  void _status;
  const mitigated = headers["cf-mitigated"] ?? headers["CF-Mitigated"];
  if (mitigated && /challenge/i.test(mitigated)) return { vendor: "cloudflare", reason: "Cloudflare challenge (cf-mitigated)." };
  // Challenge pages are small; only scan the head of large documents.
  const head = body.length > 200_000 ? body.slice(0, 200_000) : body;
  for (const marker of MARKERS) {
    if (marker.pattern.test(head)) return { vendor: marker.vendor, reason: marker.reason };
  }
  return null;
}
