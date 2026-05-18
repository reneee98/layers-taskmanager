import { formatCurrency } from "@/lib/format";

export const SUPPORTED_CURRENCIES = ["EUR", "USD"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const normalizeCurrency = (currency?: string | null): SupportedCurrency => {
  const normalized = currency?.trim().toUpperCase();
  return normalized === "USD" ? "USD" : "EUR";
};

export const getCurrencySymbol = (currency?: string | null): string => {
  return normalizeCurrency(currency) === "USD" ? "$" : "€";
};

export const getPerHourLabel = (currency?: string | null): string => {
  return `${getCurrencySymbol(currency)}/h`;
};

export const convertToEur = (
  amount: number,
  currency: string | null | undefined,
  usdPerEur?: number | null
): number | null => {
  if (normalizeCurrency(currency) !== "USD") {
    return amount;
  }

  if (!usdPerEur || usdPerEur <= 0) {
    return null;
  }

  return amount / usdPerEur;
};

export const getEuroEquivalentLabel = (
  amount: number,
  currency: string | null | undefined,
  usdPerEur?: number | null
): string | null => {
  const eurAmount = convertToEur(amount, currency, usdPerEur);

  if (eurAmount == null || normalizeCurrency(currency) !== "USD") {
    return null;
  }

  return formatCurrency(eurAmount, "EUR");
};
