import { describe, expect, it } from "vitest";
import { PARTNERS, PARTNERS_BY_SLUG } from "../registry";
import { getAdapter } from "../adapters";
import { fakeClient, fakeNet, ROBOTS_OK } from "../testing/fake-net";
import { readFixture } from "../testing/fixture-http";
import { detectAntiBot } from "./antibot";
import { BlockedError, BudgetExceededError, ForbiddenUrlError, NetworkError, RobotsDisallowedError } from "./errors";
import { checkUrl, USER_AGENT } from "./http";
import { crawlDelayMs, isAllowed, parseRobots } from "./robots";
import { sanitizeFragment } from "./sanitize";

const sunline = PARTNERS_BY_SLUG.sunline;
const tomash = PARTNERS_BY_SLUG.tomash;
const client = fakeClient;

describe("URL guard", () => {
  it("allows only registry hosts and paths, never forbidden endpoints", () => {
    expect(() => checkUrl(sunline, "https://sunline.rs/search/getdates?countryId=13")).not.toThrow();
    expect(() => checkUrl(sunline, "https://sunline.rs/sendreservation")).toThrow(ForbiddenUrlError);
    expect(() => checkUrl(sunline, "https://evil.example/search/getdates?x")).toThrow(ForbiddenUrlError);
    expect(() => checkUrl(PARTNERS_BY_SLUG.viva, "https://www.vivatravel.rs/services/calc/?objectId=1")).toThrow(ForbiddenUrlError);
    expect(() => checkUrl(PARTNERS_BY_SLUG.bigblue, "https://bigblue.rs/ScriptService/CommonForScript.asmx")).toThrow(ForbiddenUrlError);
    expect(() => checkUrl(PARTNERS_BY_SLUG.viva, "https://www.vivatravel.rs/services/get_pricelists/?publicId=58")).not.toThrow();
  });
});

describe("PartnerHttpClient", () => {
  it("checks robots once, sends the honest UA and spaces requests", async () => {
    const net = fakeNet({ "/robots.txt": [ROBOTS_OK], "/search/getdates": [{ body: "[]", headers: { "content-type": "application/json" } }] });
    const http = client(sunline, net);
    await http.getJson("https://sunline.rs/search/getdates?countryId=13");
    await http.getJson("https://sunline.rs/search/getdates?countryId=13");
    expect(net.calls.map((call) => new URL(call.url).pathname)).toEqual(["/robots.txt", "/search/getdates", "/search/getdates"]);
    expect(net.calls[1].ua).toBe(USER_AGENT);
    expect(net.calls[1].at - net.calls[0].at).toBeGreaterThanOrEqual(1500);
    expect(net.calls[2].at - net.calls[1].at).toBeGreaterThanOrEqual(1500);
    expect(http.requestsUsed).toBe(3);
  });

  it("honours Crawl-delay 10 for Tomash", async () => {
    const net = fakeNet({
      "/robots.txt": [{ body: readFixture("robots/tomash.txt"), headers: { "content-type": "text/plain" } }],
      "/wp-json/": [{ body: "[]", headers: { "content-type": "application/json" } }],
    });
    const http = client(tomash, net);
    await http.getJson("https://tomashtours.rs/wp-json/wp/v2/posts?per_page=100");
    await http.getJson("https://tomashtours.rs/wp-json/wp/v2/posts?per_page=100&page=2");
    expect(net.calls[2].at - net.calls[1].at).toBeGreaterThanOrEqual(10_000);
  });

  it("refuses robots-disallowed paths", async () => {
    const net = fakeNet({ "/robots.txt": [{ body: "User-agent: *\nDisallow: /search/\n", headers: { "content-type": "text/plain" } }] });
    await expect(client(sunline, net).getText("https://sunline.rs/search/getdates?countryId=13")).rejects.toBeInstanceOf(RobotsDisallowedError);
  });

  it("stops at the request budget (robots and retries count)", async () => {
    const net = fakeNet({ "/robots.txt": [ROBOTS_OK], "/search/": [{ status: 503 }] });
    await expect(client(sunline, net, 3).getText("https://sunline.rs/search/getdates?countryId=13")).rejects.toBeInstanceOf(BudgetExceededError);
    expect(net.calls).toHaveLength(3);
  });

  it("retries 5xx twice, then succeeds", async () => {
    const net = fakeNet({ "/robots.txt": [ROBOTS_OK], "/search/": [{ status: 503 }, { status: 503 }, { body: "[1]", headers: { "content-type": "application/json" } }] });
    const { json } = await client(sunline, net).getJson<number[]>("https://sunline.rs/search/getdates?countryId=13");
    expect(json).toEqual([1]);
    expect(net.calls).toHaveLength(4);
  });

  it("gives up after retries with a network error", async () => {
    const net = fakeNet({ "/robots.txt": [ROBOTS_OK], "/search/": [{ status: 500 }] });
    await expect(client(sunline, net).getText("https://sunline.rs/search/getdates?countryId=13")).rejects.toBeInstanceOf(NetworkError);
  });

  it("treats challenge pages with status 200 as blocked", async () => {
    const net = fakeNet({ "/robots.txt": [ROBOTS_OK], "/search/": [{ body: readFixture("antibot/travellino-home.html") }] });
    await expect(client(sunline, net).getText("https://sunline.rs/search/getdates?countryId=13")).rejects.toBeInstanceOf(BlockedError);
  });

  it("treats repeated TLS resets as blocked", async () => {
    const reset = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET", message: "socket disconnected before secure TLS connection was established" } });
    const net = fakeNet({ "/robots.txt": [ROBOTS_OK], "/search/": [reset] });
    await expect(client(sunline, net).getText("https://sunline.rs/search/getdates?countryId=13")).rejects.toBeInstanceOf(BlockedError);
  });

  it("caps response size and supports early stop", async () => {
    const big = "x".repeat(200_000);
    const net = fakeNet({ "/robots.txt": [ROBOTS_OK], "/search/": [{ body: big, headers: { "content-type": "text/plain" } }] });
    const page = await client(sunline, net).getText("https://sunline.rs/search/getdates?countryId=13", { maxBytes: 50_000 });
    expect(page.truncated).toBe(true);
    expect(page.body.length).toBeLessThan(200_000);
    const net2 = fakeNet({ "/robots.txt": [ROBOTS_OK], "/search/": [{ body: `MARK ${big}`, headers: { "content-type": "text/plain" } }] });
    const early = await client(sunline, net2).getText("https://sunline.rs/search/getdates?countryId=13", { stopWhen: (body) => body.includes("MARK") });
    expect(early.truncated).toBe(true);
  });
});

describe("robots.txt", () => {
  it("parses groups, wildcards and crawl delay", () => {
    expect(crawlDelayMs(parseRobots(readFixture("robots/tomash.txt")))).toBe(10_000);
    const bigblue = parseRobots(readFixture("robots/bigblue.txt"));
    expect(isAllowed(bigblue, "/ScriptService/CommonForScript.asmx")).toBe(false);
    expect(isAllowed(bigblue, "/sr/tour/andaluzijska-tura-11-10-2026--novo/")).toBe(true);
    expect(isAllowed(parseRobots(readFixture("robots/hellena-404.html")), "/anything")).toBe(true);
    const rules = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/ok$\n");
    expect(isAllowed(rules, "/private/x")).toBe(false);
    expect(isAllowed(rules, "/private/ok")).toBe(true);
  });
});

describe("anti-bot detection", () => {
  it("detects challenge pages and passes real pages", () => {
    for (const file of ["travellino-home.html", "balkanfun-home.html", "montesol-home.html", "holiday-listing.html"]) {
      expect(detectAntiBot(readFixture(`antibot/${file}`))).not.toBeNull();
    }
    expect(detectAntiBot(readFixture("antibot/holiday-home-real.html"))).toBeNull();
    expect(detectAntiBot("<html><title>Viva</title></html>", { server: "cloudflare" })).toBeNull();
  });
});

describe("sanitizer", () => {
  it("keeps structure and removes active content", () => {
    const html = sanitizeFragment(
      '<div onclick="x()"><h1>Naslov</h1><p style="color:red">Tekst <a href="javascript:alert(1)">link</a></p><script>alert(1)</script><iframe src="x"></iframe><img src=x onerror=alert(1)><table><tr><td colspan="2" class="x">A</td></tr></table></div>'
    )!;
    expect(html).not.toMatch(/script|onclick|onerror|javascript|iframe|<img|style=|<a /i);
    expect(html).toContain("<h3>Naslov</h3>");
    expect(html).toContain("link");
    expect(html).toContain('<td colspan="2">A</td>');
  });
});

describe("registry", () => {
  it("has 17 partners with the right statuses and safe allowlists", () => {
    expect(PARTNERS.map((partner) => partner.number).sort((a, b) => a - b)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    expect(new Set(PARTNERS.map((partner) => partner.slug)).size).toBe(17);
    expect(PARTNERS.filter((partner) => partner.status === "active")).toHaveLength(11);
    const blocked = PARTNERS.filter((partner) => partner.status === "blocked");
    expect(blocked.map((partner) => partner.slug).sort()).toEqual(["balkanfun", "holiday", "jungman", "montesol", "travellino"]);
    expect(blocked.every((partner) => !partner.liveFetchAllowed)).toBe(true);
    expect(PARTNERS_BY_SLUG.holidayplus.status).toBe("manual");
    for (const partner of PARTNERS.filter((p) => p.status === "active")) {
      const host = partner.hosts[0];
      const origin = `${partner.website.startsWith("http://") ? "http" : "https"}://${host}`;
      expect(() => checkUrl(partner, `${origin}/robots.txt`)).not.toThrow();
      expect(() => checkUrl(partner, `${origin}/services/calc/?objectId=1`)).toThrow(ForbiddenUrlError);
      expect(partner.minDelayMs).toBeGreaterThanOrEqual(1500);
    }
    expect(PARTNERS_BY_SLUG.tomash.minDelayMs).toBe(10_000);
    expect(PARTNERS_BY_SLUG.jungman.family).toBe("tourpackage");
    expect(getAdapter("bluevendo")?.mergeMode).toBe(true);
  });
});
