"use client";

import { useEffect, useState } from "react";

interface ExchangeRateData {
  usdPerEur: number;
  eurPerUsd: number;
  date: string;
  source: "ECB";
}

export const useUsdExchangeRate = (enabled: boolean) => {
  const [data, setData] = useState<ExchangeRateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const fetchRate = async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/exchange-rates/usd-eur");
        const result = await response.json();

        if (isActive && result.success) {
          setData(result.data);
        }
      } catch (error) {
        if (isActive) {
          setData(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void fetchRate();

    return () => {
      isActive = false;
    };
  }, [enabled]);

  return {
    rate: data,
    isLoading,
  };
};
