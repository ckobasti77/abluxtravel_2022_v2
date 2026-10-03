// XML sitemap parsing (pure, regex based; sitemaps are machine generated).

export type SitemapEntry = { loc: string; lastmod?: string };

export function parseSitemap(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const block of xml.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    const loc = block.match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1];
    const lastmod = block.match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/)?.[1];
    if (loc) entries.push({ loc: loc.replace(/&amp;/g, "&"), lastmod: lastmod || undefined });
  }
  return entries;
}

/** loc → lastmod ("" when missing). */
export function parseSitemapLastmod(xml: string): Map<string, string> {
  return new Map(parseSitemap(xml).map((entry) => [entry.loc, entry.lastmod ?? ""]));
}
