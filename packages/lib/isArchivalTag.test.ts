import { describe, it, expect } from "vitest";
import { isArchivalTag } from "./isArchivalTag";

describe("isArchivalTag", () => {
  it("returns true when archiveAsScreenshot is boolean true", () => {
    const tag = { archiveAsScreenshot: true };
    expect(isArchivalTag(tag)).toBe(true);
  });

  it("returns true when archiveAsScreenshot is boolean false", () => {
    const tag = { archiveAsScreenshot: false };
    expect(isArchivalTag(tag)).toBe(true);
  });

  it("returns true when archiveAsMonolith is boolean", () => {
    const tag = { archiveAsMonolith: true };
    expect(isArchivalTag(tag)).toBe(true);
  });

  it("returns true when archiveAsPDF is boolean", () => {
    const tag = { archiveAsPDF: true };
    expect(isArchivalTag(tag)).toBe(true);
  });

  it("returns true when archiveAsReadable is boolean", () => {
    const tag = { archiveAsReadable: true };
    expect(isArchivalTag(tag)).toBe(true);
  });

  it("returns true when archiveAsWaybackMachine is boolean", () => {
    const tag = { archiveAsWaybackMachine: false };
    expect(isArchivalTag(tag)).toBe(true);
  });

  it("returns true when aiTag is boolean", () => {
    const tag = { aiTag: true };
    expect(isArchivalTag(tag)).toBe(true);
  });

  it("returns false when no archival properties are present", () => {
    const tag = { name: "regular-tag" };
    expect(isArchivalTag(tag)).toBe(false);
  });

  it("returns false when archival properties are null", () => {
    const tag = {
      archiveAsScreenshot: null,
      archiveAsMonolith: null,
    };
    expect(isArchivalTag(tag)).toBe(false);
  });

  it("returns false when archival properties are undefined", () => {
    const tag = {
      archiveAsScreenshot: undefined,
    };
    expect(isArchivalTag(tag)).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(isArchivalTag({})).toBe(false);
  });

  it("returns true when multiple archival properties are set", () => {
    const tag = {
      archiveAsScreenshot: true,
      archiveAsPDF: false,
      archiveAsReadable: true,
    };
    expect(isArchivalTag(tag)).toBe(true);
  });

  it("returns true when only one archival property is boolean among many", () => {
    const tag = {
      name: "my-tag",
      archiveAsScreenshot: null,
      archiveAsPDF: true,
      archiveAsReadable: undefined,
    };
    expect(isArchivalTag(tag)).toBe(true);
  });
});
