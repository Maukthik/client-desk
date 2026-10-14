const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

export const CURRENCIES = [
  { code: "usd", label: "USD — US Dollar" },
  { code: "eur", label: "EUR — Euro" },
  { code: "gbp", label: "GBP — British Pound" },
  { code: "cad", label: "CAD — Canadian Dollar" },
  { code: "aud", label: "AUD — Australian Dollar" },
  { code: "nzd", label: "NZD — New Zealand Dollar" },
  { code: "chf", label: "CHF — Swiss Franc" },
  { code: "sek", label: "SEK — Swedish Krona" },
  { code: "inr", label: "INR — Indian Rupee" },
  { code: "jpy", label: "JPY — Japanese Yen" },
] as const;

export function minorUnitFactor(currency: string) {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? 1 : 100;
}

/** Formats an amount stored in minor units (cents) for display. */
export function formatMoney(amount: number, currency: string, opts: { compact?: boolean } = {}) {
  const value = amount / minorUnitFactor(currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    notation: opts.compact ? "compact" : "standard",
    // Explicit min+max: engines disagree when only max is below the currency default.
    ...(opts.compact ? { minimumFractionDigits: 0, maximumFractionDigits: 1 } : {}),
  }).format(value);
}

/** Converts a user-entered major-unit amount ("12.50") to minor units (1250). */
export function toMinorUnits(value: number, currency: string) {
  return Math.round(value * minorUnitFactor(currency));
}

export function fromMinorUnits(value: number, currency: string) {
  return value / minorUnitFactor(currency);
}

export type LineItemInput = { quantity: number; unitAmount: number };

/** Computes invoice totals. unitAmount is in minor units, taxRate in basis points. */
export function computeInvoiceTotals(items: LineItemInput[], taxRate: number) {
  const lines = items.map((item) => Math.round(item.quantity * item.unitAmount));
  const subtotal = lines.reduce((sum, line) => sum + line, 0);
  const tax = Math.round((subtotal * taxRate) / 10000);
  return { lines, subtotal, tax, total: subtotal + tax };
}
