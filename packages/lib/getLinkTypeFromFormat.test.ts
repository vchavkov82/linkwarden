import { describe, it, expect } from "vitest";
import getLinkTypeFromFormat from "./getLinkTypeFromFormat";
import { ArchivedFormat } from "@linkwarden/types";

describe("getLinkTypeFromFormat", () => {
  it("returns 'readable' for readability format", () => {
    expect(getLinkTypeFromFormat(ArchivedFormat.readability)).toBe("readable");
  });

  it("returns 'monolith' for monolith format", () => {
    expect(getLinkTypeFromFormat(ArchivedFormat.monolith)).toBe("monolith");
  });

  it("returns 'image' for jpeg format", () => {
    expect(getLinkTypeFromFormat(ArchivedFormat.jpeg)).toBe("image");
  });

  it("returns 'image' for png format", () => {
    expect(getLinkTypeFromFormat(ArchivedFormat.png)).toBe("image");
  });

  it("returns 'pdf' for pdf format", () => {
    expect(getLinkTypeFromFormat(ArchivedFormat.pdf)).toBe("pdf");
  });

  it("throws error for invalid format", () => {
    expect(() => getLinkTypeFromFormat("invalid" as ArchivedFormat)).toThrow("Invalid file type.");
  });
});
