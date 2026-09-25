import { describe, it, expect } from "vitest";
import { cn, toJsDate } from "./utils";

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});

describe("toJsDate", () => {
  it("converts a Firestore-like Timestamp object via toDate()", () => {
    const target = new Date("2024-03-01T00:00:00.000Z");
    const timestamp = { toDate: () => target };
    expect(toJsDate(timestamp)).toBe(target);
  });

  it("converts an ISO string", () => {
    const result = toJsDate("2024-03-01T00:00:00.000Z");
    expect(result.toISOString()).toBe("2024-03-01T00:00:00.000Z");
  });

  it("converts an epoch number", () => {
    const result = toJsDate(1709251200000);
    expect(result.getTime()).toBe(1709251200000);
  });

  it("passes a Date instance through", () => {
    const date = new Date("2024-03-01T00:00:00.000Z");
    expect(toJsDate(date)).toEqual(date);
  });

  it("falls back to the epoch for null/undefined", () => {
    expect(toJsDate(null).getTime()).toBe(0);
    expect(toJsDate(undefined).getTime()).toBe(0);
  });
});
