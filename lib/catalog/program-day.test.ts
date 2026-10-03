import { describe, expect, it } from "vitest";
import { programDayHtml, programDayTitle } from "./program-day";

describe("program day cleanup", () => {
  it("drops a repeated day number from the title", () => {
    expect(programDayTitle({ day: 1, title: "1.dan BEOGRAD" })).toBe("BEOGRAD");
    expect(programDayTitle({ day: 2, title: "2. dan BOLONJA – RIMINI" })).toBe("BOLONJA – RIMINI");
  });
  it("keeps titles that do not repeat the same day", () => {
    expect(programDayTitle({ day: 3, title: "2. dan Napulj" })).toBe("2. dan Napulj");
    expect(programDayTitle({ day: 1, title: "Beograd – Solun" })).toBe("Beograd – Solun");
    expect(programDayTitle({ day: 1, title: "1. dan" })).toBe("1. dan");
  });
  it("removes the leading dan/N badge paragraphs only", () => {
    const html = "<p> <p>dan</p> <p>1</p> <p> <p>Polazak oko 16.00 časova.</p> </p>";
    expect(programDayHtml(html)).toBe("<p>  <p> <p>Polazak oko 16.00 časova.</p> </p>");
    expect(programDayHtml("<p>Dan 1 je slobodan.</p>")).toBe("<p>Dan 1 je slobodan.</p>");
  });
});
