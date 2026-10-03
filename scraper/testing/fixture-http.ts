// Fixture-backed HttpLike for tests and the relay `--fixtures` mode.
// Never touches the network; fails on unmapped URLs and records requests.
import { readFileSync } from "node:fs";
import path from "node:path";
import { checkUrl } from "../core/http";
import type { GetTextOptions, HttpLike, PartnerConfig, RawPage } from "../core/types";

export const FIXTURES_DIR = path.resolve(import.meta.dirname, "..", "__fixtures__");

export function readFixture(relative: string): string {
  return readFileSync(path.join(FIXTURES_DIR, relative), "utf8");
}

export type FixtureRoute = { match: string | RegExp; file: string; status?: number; contentType?: string };

export class FixtureHttp implements HttpLike {
  readonly requested: string[] = [];

  constructor(
    private readonly routes: FixtureRoute[],
    private readonly config?: PartnerConfig
  ) {}

  /** True when a fixture is mapped for the URL (relay --fixtures skips the rest). */
  has(url: string): boolean {
    return this.routes.some((r) => (typeof r.match === "string" ? url === r.match : r.match.test(url)));
  }

  async getText(url: string, opts: GetTextOptions = {}): Promise<RawPage> {
    if (this.config) checkUrl(this.config, url);
    this.requested.push(url);
    const route = this.routes.find((r) => (typeof r.match === "string" ? url === r.match : r.match.test(url)));
    if (!route) throw new Error(`FixtureHttp: no fixture for ${url}`);
    let body = readFixture(route.file);
    let truncated = false;
    if (opts.stopWhen) {
      // Simulate the streamed read: 1 KB chunks, stop as soon as the predicate holds.
      for (let end = 1024; end < body.length; end += 1024) {
        if (opts.stopWhen(body.slice(0, end))) {
          body = body.slice(0, end);
          truncated = true;
          break;
        }
      }
    }
    if (opts.maxBytes && body.length > opts.maxBytes) {
      body = body.slice(0, opts.maxBytes);
      truncated = true;
    }
    const contentType = route.contentType ?? (route.file.endsWith(".json") ? "application/json" : route.file.endsWith(".xml") ? "application/xml" : "text/html; charset=utf-8");
    return { url, status: route.status ?? 200, contentType, body, truncated };
  }

  async getJson<T>(url: string): Promise<{ page: RawPage; json: T }> {
    const page = await this.getText(url);
    return { page, json: JSON.parse(page.body) as T };
  }
}
