import { describe, it, expect } from "vitest";
import getFormatFromContentType from "./getFormatFromContentType";
import { ArchivedFormat } from "@linkwarden/types";

describe("getFormatFromContentType", () => {
  it("returns jpeg format for image/jpg", () => {
    expect(getFormatFromContentType("image/jpg")).toBe(ArchivedFormat.jpeg);
  });

  it("returns jpeg format for image/jpeg", () => {
    expect(getFormatFromContentType("image/jpeg")).toBe(ArchivedFormat.jpeg);
  });

  it("returns png format for image/png", () => {
    expect(getFormatFromContentType("image/png")).toBe(ArchivedFormat.png);
  });

  it("returns pdf format for application/pdf", () => {
    expect(getFormatFromContentType("application/pdf")).toBe(ArchivedFormat.pdf);
  });

  it("returns monolith format for text/html", () => {
    expect(getFormatFromContentType("text/html")).toBe(ArchivedFormat.monolith);
  });

  it("returns readability format for text/plain", () => {
    expect(getFormatFromContentType("text/plain")).toBe(ArchivedFormat.readability);
  });

  it("throws error for unsupported content type", () => {
    expect(() => getFormatFromContentType("video/mp4")).toThrow("Invalid file type.");
  });

  it("throws error for empty string", () => {
    expect(() => getFormatFromContentType("")).toThrow("Invalid file type.");
  });

  it("throws error for unknown content type", () => {
    expect(() => getFormatFromContentType("application/json")).toThrow("Invalid file type.");
  });

  it("is case sensitive", () => {
    expect(() => getFormatFromContentType("IMAGE/PNG")).toThrow("Invalid file type.");
  });
});
