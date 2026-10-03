// Minimal robots.txt parser/matcher (RFC 9309 subset): groups, Allow/Disallow
// with * and $, longest match wins, Allow wins ties, Crawl-delay.

export type RobotsRules = {
  allow: string[];
  disallow: string[];
  crawlDelaySec?: number;
};

export const ALLOW_ALL: RobotsRules = { allow: [], disallow: [] };
export const USER_AGENT_TOKEN = "ablux";

export function parseRobots(text: string, token = USER_AGENT_TOKEN): RobotsRules {
  if (/^\s*</.test(text)) return ALLOW_ALL; // HTML error page served as robots.txt
  type Group = { agents: string[]; rules: RobotsRules };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: { allow: [], disallow: [] } };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" && value) current.rules.allow.push(value);
    else if (key === "disallow" && value) current.rules.disallow.push(value);
    else if (key === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds > 0) current.rules.crawlDelaySec = seconds;
    }
  }
  const specific = groups.find((group) => group.agents.some((agent) => agent !== "*" && token.includes(agent.replace(/\/.*$/, ""))));
  const wildcard = groups.find((group) => group.agents.includes("*"));
  return (specific ?? wildcard)?.rules ?? ALLOW_ALL;
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

/** pathWithQuery like "/services/list/?_page=1". */
export function isAllowed(rules: RobotsRules, pathWithQuery: string): boolean {
  let best: { length: number; allow: boolean } | null = null;
  for (const [list, allow] of [
    [rules.disallow, false],
    [rules.allow, true],
  ] as const) {
    for (const pattern of list) {
      if (!patternToRegExp(pattern).test(pathWithQuery)) continue;
      const length = pattern.length;
      if (!best || length > best.length || (length === best.length && allow)) best = { length, allow };
    }
  }
  return best ? best.allow : true;
}

export function crawlDelayMs(rules: RobotsRules): number {
  return rules.crawlDelaySec ? Math.round(rules.crawlDelaySec * 1000) : 0;
}
