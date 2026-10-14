import { describe, expect, it } from "vitest";
import { computeInvoiceTotals, formatMoney, fromMinorUnits, toMinorUnits } from "./money";

describe("computeInvoiceTotals", () => {
  it("sums line items and applies tax in basis points", () => {
    const totals = computeInvoiceTotals(
      [
        { quantity: 2, unitAmount: 125050 },
        { quantity: 1, unitAmount: 300000 },
      ],
      1000,
    );
    expect(totals).toEqual({ lines: [250100, 300000], subtotal: 550100, tax: 55010, total: 605110 });
  });

  it("rounds fractional quantities to whole minor units", () => {
    const totals = computeInvoiceTotals([{ quantity: 1.5, unitAmount: 3333 }], 825);
    expect(totals.lines).toEqual([5000]); // 4999.5 -> 5000
    expect(totals.tax).toBe(413); // 412.5 -> 413
    expect(totals.total).toBe(5413);
  });

  it("handles an empty invoice", () => {
    expect(computeInvoiceTotals([], 0)).toEqual({ lines: [], subtotal: 0, tax: 0, total: 0 });
  });
});

describe("minor units", () => {
  it("converts two-decimal currencies", () => {
    expect(toMinorUnits(12.5, "usd")).toBe(1250);
    expect(toMinorUnits(0.1 + 0.2, "eur")).toBe(30);
    expect(fromMinorUnits(1250, "usd")).toBe(12.5);
  });

  it("treats zero-decimal currencies as whole units", () => {
    expect(toMinorUnits(1500, "jpy")).toBe(1500);
    expect(formatMoney(1500, "jpy")).toBe("¥1,500");
  });
});

describe("formatMoney", () => {
  it("formats standard and compact amounts", () => {
    expect(formatMoney(605110, "usd")).toBe("$6,051.10");
    expect(formatMoney(2_000_000, "usd", { compact: true })).toBe("$20K");
    expect(formatMoney(0, "usd", { compact: true })).toBe("$0");
  });
});
