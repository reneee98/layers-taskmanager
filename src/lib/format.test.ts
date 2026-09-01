import { describe, it, expect } from "vitest";
import { formatCurrency, formatHours } from "./format";

describe("formatCurrency", () => {
  it("should format number to EUR currency with sk-SK locale by default", () => {
    const result = formatCurrency(1234.56);
    // Use regex to handle non-breaking spaces
    expect(result).toMatch(/1[\s\u00A0]234,56[\s\u00A0]€/);
  });

  it("should format zero correctly", () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/0,00[\s\u00A0]€/);
  });

  it("should format negative numbers correctly", () => {
    const result = formatCurrency(-99.99);
    expect(result).toMatch(/-99,99[\s\u00A0]€/);
  });

  it("should round to 2 decimal places", () => {
    const result = formatCurrency(10.12345);
    expect(result).toMatch(/10,12[\s\u00A0]€/);
  });

  it("should handle large numbers", () => {
    const result = formatCurrency(1234567.89);
    expect(result).toMatch(/1[\s\u00A0]234[\s\u00A0]567,89[\s\u00A0]€/);
  });

  it("should support custom currency", () => {
    const result = formatCurrency(100, "USD", "en-US");
    expect(result).toBe("$100.00");
  });

  it("should support custom locale", () => {
    const result = formatCurrency(1000, "EUR", "de-DE");
    expect(result).toMatch(/1\.000,00[\s\u00A0]€/);
  });

  it("should handle decimal precision correctly", () => {
    const result = formatCurrency(99.996);
    expect(result).toMatch(/100,00[\s\u00A0]€/);
  });
});

describe("formatHours", () => {
  it("should format decimal hours as HH:MM", () => {
    expect(formatHours(8.5)).toBe("08:30");
  });

  it("should round to the nearest minute", () => {
    expect(formatHours(8.12345)).toBe("08:07");
  });

  it("should handle zero hours", () => {
    expect(formatHours(0)).toBe("00:00");
  });

  it("should handle negative hours", () => {
    expect(formatHours(-2.5)).toBe("-02:30");
  });

  it("should carry rounded minutes into the next hour", () => {
    expect(formatHours(1.999)).toBe("02:00");
  });

  it("should display very small values as zero minutes", () => {
    expect(formatHours(0.001)).toBe("00:00");
  });

  it("should not truncate large hour totals", () => {
    expect(formatHours(1234.567)).toBe("1234:34");
  });

  it("should safely handle invalid values", () => {
    expect(formatHours(Number.NaN)).toBe("00:00");
    expect(formatHours(Number.POSITIVE_INFINITY)).toBe("00:00");
  });
});
