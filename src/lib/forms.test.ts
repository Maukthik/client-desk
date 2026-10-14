import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldErrors, safeRedirectPath } from "./forms";

describe("safeRedirectPath", () => {
  it("allows same-origin paths", () => {
    expect(safeRedirectPath("/invoices/abc?x=1")).toBe("/invoices/abc?x=1");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", "", null, 42]) {
      expect(safeRedirectPath(bad)).toBe("/dashboard");
    }
  });
});

describe("fieldErrors", () => {
  it("keeps the first message per field", () => {
    const result = z.object({ email: z.email("Bad email").min(50, "Too short") }).safeParse({ email: "x" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toEqual({ email: "Bad email" });
  });
});
