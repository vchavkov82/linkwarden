import { describe, it, expect, vi } from "vitest";
import { titleCase, delay, cn } from "./utils";

describe("titleCase", () => {
  it("converts lowercase string to title case", () => {
    expect(titleCase("hello world")).toBe("Hello World");
  });

  it("converts uppercase string to title case", () => {
    expect(titleCase("HELLO WORLD")).toBe("Hello World");
  });

  it("handles single word", () => {
    expect(titleCase("hello")).toBe("Hello");
  });

  it("handles empty string", () => {
    expect(titleCase("")).toBe("");
  });

  it("handles mixed case", () => {
    expect(titleCase("hElLo WoRlD")).toBe("Hello World");
  });

  it("handles multiple spaces", () => {
    expect(titleCase("hello  world")).toBe("Hello  World");
  });

  it("capitalizes each word in a sentence", () => {
    expect(titleCase("the quick brown fox")).toBe("The Quick Brown Fox");
  });
});

describe("delay", () => {
  it("returns a promise", () => {
    const result = delay(0);
    expect(result).toBeInstanceOf(Promise);
  });

  it("resolves after specified seconds", async () => {
    vi.useFakeTimers();
    const promise = delay(1);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it("handles zero seconds", async () => {
    vi.useFakeTimers();
    const promise = delay(0);
    vi.advanceTimersByTime(0);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it("handles fractional seconds", async () => {
    vi.useFakeTimers();
    const promise = delay(0.5);
    vi.advanceTimersByTime(500);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("handles undefined values", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });

  it("handles null values", () => {
    expect(cn("foo", null, "bar")).toBe("foo bar");
  });

  it("merges tailwind classes correctly", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles array of classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles object syntax", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles complex tailwind merging", () => {
    expect(cn("px-4 py-2", "px-6")).toBe("py-2 px-6");
  });

  it("handles multiple conflicting classes", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});
