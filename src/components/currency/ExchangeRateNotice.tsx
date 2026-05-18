"use client";

import { normalizeCurrency } from "@/lib/currency";
import { useUsdExchangeRate } from "@/hooks/useUsdExchangeRate";

interface ExchangeRateNoticeProps {
  currency?: string | null;
}

export const ExchangeRateNotice = ({ currency }: ExchangeRateNoticeProps) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const { rate, isLoading } = useUsdExchangeRate(normalizedCurrency === "USD");

  if (normalizedCurrency !== "USD") {
    return null;
  }

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Načítavam aktuálny kurz USD/EUR...</p>;
  }

  if (!rate) {
    return (
      <p className="text-xs text-muted-foreground">
        Kurz USD/EUR sa teraz nepodarilo načítať.
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      Aktuálny kurz ECB: 1 € = ${rate.usdPerEur.toFixed(4)} • 1 $ = €{rate.eurPerUsd.toFixed(4)}
    </p>
  );
};
