import { describe, expect, it } from "vitest";
import { formatBytes, initials, parseDateInput, toDateInput } from "./utils";

describe("utils", () => {
  it("round-trips date inputs as UTC days", () => {
    const d = parseDateInput("2026-03-01");
    expect(d?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(toDateInput(d)).toBe("2026-03-01");
    expect(parseDateInput("not a date")).toBeNull();
    expect(parseDateInput("")).toBeNull();
  });

  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(50 * 1024 * 1024)).toBe("50 MB");
  });

  it("builds initials", () => {
    expect(initials("Jordan  Lee")).toBe("JL");
    expect(initials("acme")).toBe("A");
  });
});
