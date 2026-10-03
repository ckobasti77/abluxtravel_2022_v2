// Polite HTTP client shared by the Convex worker and the relay CLI (Node).
// Enforces: host + path allowlist, endpoint denylist, request budget,
// robots.txt, per-host delay, honest User-Agent, anti-bot detection by
// content, timeouts, limited retries, response size limits.
import { detectAntiBot } from "./antibot";
import {
  BlockedError,
  BudgetExceededError,
  ForbiddenUrlError,
  NetworkError,
  ParseError,
  RobotsDisallowedError,
} from "./errors";
import { ALLOW_ALL, crawlDelayMs, isAllowed, parseRobots, type RobotsRules } from "./robots";
import type { GetTextOptions, HttpLike, LogLevel, PartnerConfig, RawPage } from "./types";

export const USER_AGENT = "ABLuxPartnerSync/1.0 (+https://www.abluxtravel.com; info@abluxtravel.com)";
const ROBOTS_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 25_000;

/** Endpoints that are never fetched, whatever the partner allowlist says. */
export const GLOBAL_DENYLIST: RegExp[] = [
  /\.(asmx|ashx)(\?|\/|$)/i,
  /\/services\/(calc|inquiry|contact|booking\w*|promo\w*|gds_list_calculation|mars_calculation\w*|ch_at|search_offer|pdf)\b/i,
  /\/(sendreservation|get_hotel_price(\.php)?|managebooking|wp-admin|wp-login\.php|checkout|cart|korpa|upit|kontakt)(\/|\?|$)/i,
  /[?&](affaction|cmd)=/i,
];

export type RobotsCacheEntry = { fetchedAt: number; status: number; rules: RobotsRules };
export type RobotsCache = Record<string, RobotsCacheEntry>;
export type ClientState = { lastRequestAt: Record<string, number> };
export type BinaryPage = { url: string; status: number; contentType: string; bytes: Uint8Array; tooLarge: boolean };

export type HttpClientOptions = {
  config: PartnerConfig;
  budget: { max: number; used: number };
  state?: ClientState;
  robotsCache?: RobotsCache;
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  log?: (level: LogLevel, text: string) => void;
  timeoutMs?: number;
  retryDelaysMs?: number[];
};

export function checkUrl(config: PartnerConfig, rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ForbiddenUrlError(`Neispravan URL: ${rawUrl}`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new ForbiddenUrlError(`Nedozvoljen protokol: ${url.protocol}`);
  if (!config.hosts.includes(url.hostname)) throw new ForbiddenUrlError(`Host nije dozvoljen: ${url.hostname}`);
  const pathWithQuery = url.pathname + url.search;
  if (GLOBAL_DENYLIST.some((pattern) => pattern.test(pathWithQuery))) {
    throw new ForbiddenUrlError(`Zabranjen endpoint: ${url.pathname}`);
  }
  if (!config.allowedPaths.some((pattern) => pattern.test(pathWithQuery))) {
    throw new ForbiddenUrlError(`Putanja nije na listi dozvoljenih: ${url.pathname}`);
  }
  return url;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

function errorCode(error: unknown): string {
  const anyError = error as { code?: string; cause?: { code?: string; message?: string }; message?: string };
  return anyError?.cause?.code ?? anyError?.code ?? "";
}

function isTlsReset(error: unknown): boolean {
  const anyError = error as { cause?: { message?: string }; message?: string };
  const text = `${anyError?.message ?? ""} ${anyError?.cause?.message ?? ""}`;
  return errorCode(error) === "ECONNRESET" || /socket disconnected before secure TLS|ECONNRESET/i.test(text);
}

function sniffCharset(contentType: string, firstBytes: Uint8Array): string {
  const fromHeader = contentType.match(/charset=["']?([\w-]+)/i)?.[1];
  if (fromHeader) return fromHeader.toLowerCase();
  const head = new TextDecoder("latin1").decode(firstBytes.slice(0, 2048));
  return head.match(/charset=["']?([\w-]+)/i)?.[1]?.toLowerCase() ?? "utf-8";
}

export class PartnerHttpClient implements HttpLike {
  private readonly config: PartnerConfig;
  private readonly budget: { max: number; used: number };
  private readonly state: ClientState;
  private readonly robots: RobotsCache;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly log: (level: LogLevel, text: string) => void;
  private readonly timeoutMs: number;
  private readonly retryDelaysMs: number[];
  robotsUpdated = false;

  constructor(options: HttpClientOptions) {
    this.config = options.config;
    this.budget = { ...options.budget };
    this.state = options.state ?? { lastRequestAt: {} };
    this.robots = { ...(options.robotsCache ?? {}) };
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? defaultSleep;
    this.log = options.log ?? (() => undefined);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryDelaysMs = options.retryDelaysMs ?? [5_000, 15_000];
  }

  get requestsUsed() {
    return this.budget.used;
  }

  get requestsLeft() {
    return Math.max(0, this.budget.max - this.budget.used);
  }

  snapshot() {
    return { state: this.state, requestsUsed: this.budget.used, robotsCache: this.robots, robotsUpdated: this.robotsUpdated };
  }

  private delayFor(host: string): number {
    const rules = this.robots[host]?.rules;
    return Math.max(this.config.minDelayMs, rules ? crawlDelayMs(rules) : 0);
  }

  private async waitTurn(host: string) {
    const last = this.state.lastRequestAt[host];
    if (last !== undefined) {
      const wait = last + this.delayFor(host) - this.now();
      if (wait > 0) await this.sleep(wait);
    }
  }

  private spend() {
    if (this.budget.used >= this.budget.max) throw new BudgetExceededError();
    this.budget.used += 1;
  }

  /** One HTTP exchange (counted, delayed). Redirects are followed manually and re-checked. */
  private async exchange(
    url: URL,
    accept: string,
    opts: GetTextOptions = {},
    onBytes?: (response: Response, url: string, headers: Record<string, string>) => Promise<RawPage>
  ): Promise<{ page: RawPage; headers: Record<string, string> }> {
    let current = url;
    for (let hop = 0; hop <= 5; hop += 1) {
      await this.waitTurn(current.hostname);
      this.spend();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(current.toString(), {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            Accept: accept,
            "Accept-Language": "sr-RS,sr;q=0.9,en;q=0.5",
          },
        });
        const headers = headersToRecord(response.headers);
        if (response.status >= 300 && response.status < 400 && headers.location) {
          this.state.lastRequestAt[current.hostname] = this.now();
          const next = new URL(headers.location, current);
          current = checkUrl(this.config, next.toString());
          continue;
        }
        const page = onBytes ? await onBytes(response, current.toString(), headers) : await this.readBody(response, current.toString(), headers, opts);
        this.state.lastRequestAt[current.hostname] = this.now();
        return { page, headers };
      } finally {
        clearTimeout(timer);
        this.state.lastRequestAt[current.hostname] = this.now();
      }
    }
    throw new NetworkError("Previše preusmeravanja.");
  }

  private async readBody(response: Response, url: string, headers: Record<string, string>, opts: GetTextOptions): Promise<RawPage> {
    const contentType = headers["content-type"] ?? "";
    const maxBytes = opts.maxBytes ?? this.config.maxBytes;
    const reader = response.body?.getReader();
    if (!reader) return { url, status: response.status, contentType, body: "", truncated: false };
    const chunks: Uint8Array[] = [];
    let total = 0;
    let truncated = false;
    let decoder: TextDecoder | null = null;
    let text = "";
    let lastCheck = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!decoder) decoder = new TextDecoder(sniffCharset(contentType, value), { fatal: false });
      const room = maxBytes - total;
      const chunk = value.byteLength > room ? value.subarray(0, Math.max(0, room)) : value;
      chunks.push(chunk);
      total += chunk.byteLength;
      text += decoder.decode(chunk, { stream: true });
      if (opts.stopWhen && text.length - lastCheck > 32_000) {
        lastCheck = text.length;
        if (opts.stopWhen(text)) {
          truncated = true;
          await reader.cancel().catch(() => undefined);
          break;
        }
      }
      if (total >= maxBytes) {
        truncated = true;
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
    if (decoder && !truncated) text += decoder.decode();
    return { url, status: response.status, contentType, body: text, truncated };
  }

  private async ensureRobots(url: URL): Promise<RobotsRules> {
    const host = url.hostname;
    const cached = this.robots[host];
    if (cached && this.now() - cached.fetchedAt < ROBOTS_TTL_MS) return cached.rules;
    const robotsUrl = new URL("/robots.txt", url);
    checkUrl(this.config, robotsUrl.toString());
    let entry: RobotsCacheEntry;
    try {
      const { page, headers } = await this.exchange(robotsUrl, "text/plain,*/*");
      // A challenge page instead of robots.txt means the site blocks us: never treat it as "allow all".
      if (/html/i.test(page.contentType) || /^\s*</.test(page.body)) {
        const hit = detectAntiBot(page.body, headers, page.status);
        if (hit) throw new BlockedError(hit.reason);
      }
      if (page.status >= 500) throw new NetworkError(`robots.txt je vratio ${page.status}.`);
      const rules = page.status >= 400 ? ALLOW_ALL : parseRobots(page.body);
      entry = { fetchedAt: this.now(), status: page.status, rules };
    } catch (error) {
      if (error instanceof BudgetExceededError || error instanceof BlockedError || error instanceof NetworkError) throw error;
      if (isTlsReset(error)) throw new BlockedError("Server prekida TLS vezu (verovatno blokira IP adrese iz oblaka).");
      throw new NetworkError(`robots.txt nije dostupan: ${(error as Error).message}`);
    }
    this.robots[host] = entry;
    this.robotsUpdated = true;
    if (entry.rules.crawlDelaySec) this.log("info", `robots.txt: Crawl-delay ${entry.rules.crawlDelaySec} s.`);
    return entry.rules;
  }

  /** Fetch robots.txt for the site host only (connectivity check). */
  async checkRobots(siteUrl: string): Promise<RobotsCacheEntry> {
    const url = checkUrl(this.config, siteUrl);
    await this.ensureRobots(url);
    return this.robots[url.hostname];
  }

  async getText(rawUrl: string, opts: GetTextOptions = {}): Promise<RawPage> {
    const url = checkUrl(this.config, rawUrl);
    const rules = await this.ensureRobots(url);
    if (!isAllowed(rules, url.pathname + url.search)) {
      throw new RobotsDisallowedError(`robots.txt zabranjuje ${url.pathname}`);
    }
    const accept = opts.accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    let tlsResets = 0;
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retryDelaysMs.length; attempt += 1) {
      try {
        const { page, headers } = await this.exchange(url, accept, opts);
        const looksHtml = /html/i.test(page.contentType) || /^\s*</.test(page.body);
        if (looksHtml || page.status === 403 || page.status === 503) {
          const hit = detectAntiBot(page.body, headers, page.status);
          if (hit) throw new BlockedError(hit.reason);
        }
        if (page.status === 403 || page.status === 451) throw new BlockedError(`Pristup odbijen (${page.status}).`);
        if (page.status === 429) {
          const retryAfter = Number(headers["retry-after"]);
          if (attempt === 0 && Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter <= 120) {
            await this.sleep(retryAfter * 1000);
            continue;
          }
          throw new NetworkError("Partner ograničava broj zahteva (429).");
        }
        if (page.status >= 500) {
          lastError = new NetworkError(`Server je vratio ${page.status}.`);
          if (attempt < this.retryDelaysMs.length) {
            await this.sleep(this.retryDelaysMs[attempt]);
            continue;
          }
          throw lastError;
        }
        return page;
      } catch (error) {
        if (
          error instanceof BlockedError ||
          error instanceof BudgetExceededError ||
          error instanceof ForbiddenUrlError ||
          error instanceof RobotsDisallowedError ||
          error instanceof NetworkError
        ) {
          throw error;
        }
        lastError = error;
        if (isTlsReset(error)) {
          tlsResets += 1;
          if (tlsResets >= 2) throw new BlockedError("Server prekida TLS vezu (verovatno blokira IP adrese iz oblaka).");
        }
        if (attempt < this.retryDelaysMs.length) {
          this.log("warn", `Mrežna greška (${errorCode(error) || (error as Error).name}); ponovni pokušaj.`);
          await this.sleep(this.retryDelaysMs[attempt]);
          continue;
        }
      }
    }
    const code = errorCode(lastError);
    throw new NetworkError(`Sajt nije odgovorio${code ? ` (${code})` : ""}.`);
  }

  /**
   * Binary download (images copied to storage, D15): same guard, robots,
   * delay and budget as pages; one attempt, no retries; capped at `maxBytes`.
   */
  async getBinary(rawUrl: string, opts: { maxBytes: number; accept?: string }): Promise<BinaryPage> {
    const url = checkUrl(this.config, rawUrl);
    const rules = await this.ensureRobots(url);
    if (!isAllowed(rules, url.pathname + url.search)) throw new RobotsDisallowedError(`robots.txt zabranjuje ${url.pathname}`);
    let bytes: Uint8Array = new Uint8Array(0);
    let tooLarge = false;
    try {
      const { page } = await this.exchange(url, opts.accept ?? "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8", {}, async (response, finalUrl, headers) => {
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > opts.maxBytes) {
              tooLarge = true;
              await reader.cancel().catch(() => undefined);
              break;
            }
            chunks.push(value);
          }
        }
        bytes = new Uint8Array(total > opts.maxBytes ? 0 : total);
        let offset = 0;
        if (!tooLarge) for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return { url: finalUrl, status: response.status, contentType: headers["content-type"] ?? "", body: "", truncated: tooLarge };
      });
      return { url: page.url, status: page.status, contentType: page.contentType, bytes, tooLarge };
    } catch (error) {
      if (error instanceof BudgetExceededError || error instanceof ForbiddenUrlError || error instanceof RobotsDisallowedError) throw error;
      if (isTlsReset(error)) throw new BlockedError("Server prekida TLS vezu.");
      throw new NetworkError(`Slika nije preuzeta${errorCode(error) ? ` (${errorCode(error)})` : ""}.`);
    }
  }

  async getJson<T>(rawUrl: string): Promise<{ page: RawPage; json: T }> {
    const page = await this.getText(rawUrl, { accept: "application/json,text/plain;q=0.9,*/*;q=0.5" });
    if (page.status >= 400) throw new ParseError(`JSON endpoint je vratio ${page.status}.`);
    try {
      return { page, json: JSON.parse(page.body) as T };
    } catch {
      throw new ParseError("Odgovor nije ispravan JSON.");
    }
  }
}
