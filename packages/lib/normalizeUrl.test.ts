import { describe, it, expect } from "vitest";
import { normalizeUrl, getUrlVariants } from "./normalizeUrl";

describe("normalizeUrl", () => {
  describe("basic normalization", () => {
    it("returns null for null input", () => {
      expect(normalizeUrl(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(normalizeUrl(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(normalizeUrl("")).toBeNull();
    });

    it("normalizes hostname to lowercase", () => {
      const result = normalizeUrl("https://EXAMPLE.COM/path");
      expect(result).toBe("https://example.com/path");
    });

    it("trims whitespace from URL", () => {
      const result = normalizeUrl("  https://example.com  ");
      expect(result).toBe("https://example.com");
    });

    it("removes trailing slashes", () => {
      const result = normalizeUrl("https://example.com/path/");
      expect(result).toBe("https://example.com/path");
    });

    it("removes multiple trailing slashes", () => {
      const result = normalizeUrl("https://example.com/path///");
      expect(result).toBe("https://example.com/path");
    });
  });

  describe("www handling", () => {
    it("strips www. by default", () => {
      const result = normalizeUrl("https://www.example.com");
      expect(result).toBe("https://example.com");
    });

    it("preserves www. when stripWww is false", () => {
      const result = normalizeUrl("https://www.example.com", {
        stripWww: false,
      });
      expect(result).toBe("https://www.example.com");
    });
  });

  describe("fragment handling", () => {
    it("strips fragment by default", () => {
      const result = normalizeUrl("https://example.com/page#section");
      expect(result).toBe("https://example.com/page");
    });

    it("preserves fragment when stripFragment is false", () => {
      const result = normalizeUrl("https://example.com/page#section", {
        stripFragment: false,
      });
      expect(result).toBe("https://example.com/page#section");
    });
  });

  describe("tracking parameters", () => {
    it("removes utm_source parameter", () => {
      const result = normalizeUrl("https://example.com?utm_source=google");
      expect(result).toBe("https://example.com");
    });

    it("removes utm_medium parameter", () => {
      const result = normalizeUrl("https://example.com?utm_medium=email");
      expect(result).toBe("https://example.com");
    });

    it("removes utm_campaign parameter", () => {
      const result = normalizeUrl("https://example.com?utm_campaign=test");
      expect(result).toBe("https://example.com");
    });

    it("removes fbclid parameter", () => {
      const result = normalizeUrl("https://example.com?fbclid=abc123");
      expect(result).toBe("https://example.com");
    });

    it("removes gclid parameter", () => {
      const result = normalizeUrl("https://example.com?gclid=xyz789");
      expect(result).toBe("https://example.com");
    });

    it("removes multiple tracking parameters", () => {
      const result = normalizeUrl(
        "https://example.com?utm_source=google&utm_medium=cpc&fbclid=abc"
      );
      expect(result).toBe("https://example.com");
    });

    it("preserves non-tracking parameters", () => {
      const result = normalizeUrl("https://example.com?page=1&sort=date");
      expect(result).toBe("https://example.com/?page=1&sort=date");
    });

    it("removes tracking params while preserving others", () => {
      const result = normalizeUrl(
        "https://example.com?page=1&utm_source=google&sort=date"
      );
      expect(result).toBe("https://example.com/?page=1&sort=date");
    });

    it("preserves tracking params when stripTrackingParams is false", () => {
      const result = normalizeUrl(
        "https://example.com?utm_source=google",
        { stripTrackingParams: false }
      );
      expect(result).toBe("https://example.com/?utm_source=google");
    });
  });

  describe("port handling", () => {
    it("removes default HTTP port 80", () => {
      const result = normalizeUrl("http://example.com:80/path");
      expect(result).toBe("http://example.com/path");
    });

    it("removes default HTTPS port 443", () => {
      const result = normalizeUrl("https://example.com:443/path");
      expect(result).toBe("https://example.com/path");
    });

    it("preserves non-default ports", () => {
      const result = normalizeUrl("https://example.com:8080/path");
      expect(result).toBe("https://example.com:8080/path");
    });
  });

  describe("protocol handling", () => {
    it("forces HTTPS when forceHttps is true", () => {
      const result = normalizeUrl("http://example.com", { forceHttps: true });
      expect(result).toBe("https://example.com");
    });

    it("keeps HTTP when forceHttps is false (default)", () => {
      const result = normalizeUrl("http://example.com");
      expect(result).toBe("http://example.com");
    });
  });

  describe("query parameter sorting", () => {
    it("sorts query parameters alphabetically", () => {
      const result = normalizeUrl("https://example.com?z=1&a=2&m=3");
      expect(result).toBe("https://example.com/?a=2&m=3&z=1");
    });
  });

  describe("invalid URLs", () => {
    it("handles invalid URL gracefully", () => {
      const result = normalizeUrl("not-a-valid-url");
      expect(result).toBe("not-a-valid-url");
    });

    it("handles URL without protocol", () => {
      const result = normalizeUrl("example.com/path");
      expect(result).toBe("example.com/path");
    });
  });
});

describe("getUrlVariants", () => {
  it("returns empty array for null input", () => {
    expect(getUrlVariants(null)).toEqual([]);
  });

  it("returns original URL and www variant for URL without www", () => {
    const variants = getUrlVariants("https://example.com/path");
    expect(variants).toContain("https://example.com/path");
    expect(variants).toContain("https://www.example.com/path");
    expect(variants).toHaveLength(2);
  });

  it("returns original URL and non-www variant for URL with www", () => {
    const variants = getUrlVariants("https://www.example.com/path");
    expect(variants).toContain("https://www.example.com/path");
    expect(variants).toContain("https://example.com/path");
    expect(variants).toHaveLength(2);
  });

  it("removes duplicate variants", () => {
    const variants = getUrlVariants("https://example.com");
    const uniqueVariants = [...new Set(variants)];
    expect(variants.length).toBe(uniqueVariants.length);
  });

  it("handles invalid URL gracefully", () => {
    const variants = getUrlVariants("not-a-valid-url");
    expect(variants).toEqual(["not-a-valid-url"]);
  });
});
