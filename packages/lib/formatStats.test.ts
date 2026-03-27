import { describe, it, expect } from "vitest";
import { formatAvailable, atLeastOneFormatAvailable } from "./formatStats";

describe("formatAvailable", () => {
  it("returns false for null link", () => {
    expect(formatAvailable(null as any, "image")).toBe(false);
  });

  it("returns false for undefined link", () => {
    expect(formatAvailable(undefined as any, "pdf")).toBe(false);
  });

  it("returns false when format is null", () => {
    const link = { image: null } as any;
    expect(formatAvailable(link, "image")).toBe(false);
  });

  it("returns false when format is undefined", () => {
    const link = {} as any;
    expect(formatAvailable(link, "image")).toBe(false);
  });

  it("returns false when format is 'unavailable'", () => {
    const link = { image: "unavailable" } as any;
    expect(formatAvailable(link, "image")).toBe(false);
  });

  it("returns true when image format is available", () => {
    const link = { image: "screenshot.png" } as any;
    expect(formatAvailable(link, "image")).toBe(true);
  });

  it("returns true when pdf format is available", () => {
    const link = { pdf: "document.pdf" } as any;
    expect(formatAvailable(link, "pdf")).toBe(true);
  });

  it("returns true when readable format is available", () => {
    const link = { readable: "article.html" } as any;
    expect(formatAvailable(link, "readable")).toBe(true);
  });

  it("returns true when monolith format is available", () => {
    const link = { monolith: "page.html" } as any;
    expect(formatAvailable(link, "monolith")).toBe(true);
  });

  it("returns true when preview format is available", () => {
    const link = { preview: "preview.png" } as any;
    expect(formatAvailable(link, "preview")).toBe(true);
  });

  it("returns false when format is empty string", () => {
    const link = { image: "" } as any;
    expect(formatAvailable(link, "image")).toBe(false);
  });
});

describe("atLeastOneFormatAvailable", () => {
  it("returns false when no formats are available", () => {
    const link = {
      image: null,
      pdf: null,
      readable: null,
      monolith: null,
    } as any;
    expect(atLeastOneFormatAvailable(link)).toBe(false);
  });

  it("returns false when all formats are 'unavailable'", () => {
    const link = {
      image: "unavailable",
      pdf: "unavailable",
      readable: "unavailable",
      monolith: "unavailable",
    } as any;
    expect(atLeastOneFormatAvailable(link)).toBe(false);
  });

  it("returns true when only image is available", () => {
    const link = {
      image: "screenshot.png",
      pdf: null,
      readable: null,
      monolith: null,
    } as any;
    expect(atLeastOneFormatAvailable(link)).toBe(true);
  });

  it("returns true when only pdf is available", () => {
    const link = {
      image: null,
      pdf: "document.pdf",
      readable: null,
      monolith: null,
    } as any;
    expect(atLeastOneFormatAvailable(link)).toBe(true);
  });

  it("returns true when only readable is available", () => {
    const link = {
      image: null,
      pdf: null,
      readable: "article.html",
      monolith: null,
    } as any;
    expect(atLeastOneFormatAvailable(link)).toBe(true);
  });

  it("returns true when only monolith is available", () => {
    const link = {
      image: null,
      pdf: null,
      readable: null,
      monolith: "page.html",
    } as any;
    expect(atLeastOneFormatAvailable(link)).toBe(true);
  });

  it("returns true when multiple formats are available", () => {
    const link = {
      image: "screenshot.png",
      pdf: "document.pdf",
      readable: "article.html",
      monolith: "page.html",
    } as any;
    expect(atLeastOneFormatAvailable(link)).toBe(true);
  });

  it("returns true when some formats are available and others unavailable", () => {
    const link = {
      image: "screenshot.png",
      pdf: "unavailable",
      readable: null,
      monolith: "unavailable",
    } as any;
    expect(atLeastOneFormatAvailable(link)).toBe(true);
  });
});
