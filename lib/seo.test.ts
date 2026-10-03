import { describe, expect, it } from "vitest";
import { jsonLdText } from "./seo";

describe("jsonLdText", () => {
  it("cannot close the surrounding script tag", () => {
    const text = jsonLdText({ name: "Hotel </script><script>alert(1)</script>" });
    expect(text).not.toContain("<");
    expect(JSON.parse(text).name).toBe("Hotel </script><script>alert(1)</script>");
  });
});
