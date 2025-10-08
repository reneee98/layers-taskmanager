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
  it("should format hours with 2 decimal places and h suffix", () => {
    const result = formatHours(8.5);
    expect(result).toBe("8.50 h");
  });

  it("should round to 3 decimal places internally but display 2", () => {
    const result = formatHours(8.12345);
    expect(result).toBe("8.12 h");
  });

  it("should handle zero hours", () => {
    const result = formatHours(0);
    expect(result).toBe("0.00 h");
  });

  it("should handle negative hours", () => {
    const result = formatHours(-2.5);
    expect(result).toBe("-2.50 h");
  });

  it("should round correctly at 3 decimal places", () => {
    const result = formatHours(1.2345);
    // 1.2345 rounds to 1.235 (3 decimals), displays as 1.24 (2 decimals)
    expect(result).toBe("1.24 h");
  });

  it("should round up correctly", () => {
    const result = formatHours(1.2355);
    expect(result).toBe("1.24 h");
  });

  it("should handle very small numbers", () => {
    const result = formatHours(0.001);
    expect(result).toBe("0.00 h");
  });

  it("should handle large numbers", () => {
    const result = formatHours(1234.567);
    expect(result).toBe("1234.57 h");
  });

  it("should maintain precision for calculations (3 decimals)", () => {
    // Test that internal rounding is to 3 decimals
    const value = 8.1234567;
    const result = formatHours(value);
    // Should round to 8.123 internally, display as 8.12
    expect(result).toBe("8.12 h");
  });
});

