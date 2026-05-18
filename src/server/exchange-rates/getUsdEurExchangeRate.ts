export interface UsdEurExchangeRate {
  usdPerEur: number;
  eurPerUsd: number;
  date: string;
  source: "ECB";
}

const ECB_DAILY_RATES_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

export const getUsdEurExchangeRate = async (): Promise<UsdEurExchangeRate> => {
  const response = await fetch(ECB_DAILY_RATES_URL, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Nepodarilo sa načítať kurz z ECB (${response.status})`);
  }

  const xml = await response.text();
  const usdMatch = xml.match(/currency=['"]USD['"]\s+rate=['"]([\d.]+)['"]/i);
  const dateMatch = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/i);

  if (!usdMatch?.[1] || !dateMatch?.[1]) {
    throw new Error("Nepodarilo sa spracovať kurz USD/EUR z ECB");
  }

  const usdPerEur = Number.parseFloat(usdMatch[1]);

  if (!Number.isFinite(usdPerEur) || usdPerEur <= 0) {
    throw new Error("ECB vrátila neplatný kurz USD/EUR");
  }

  return {
    usdPerEur,
    eurPerUsd: 1 / usdPerEur,
    date: dateMatch[1],
    source: "ECB",
  };
};
